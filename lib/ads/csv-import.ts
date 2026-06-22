// CSV import: parsing the Meta/Facebook "Ads report" export and fuzzy-matching
// each row's "Ad name" to an existing ad. Pure functions only (client-safe).
//
// The export is one reporting day per file. Each data row carries spend + leads
// for one ad; the first data row (blank "Ad name") is the account total and is
// dropped. Ad names are noisy ("3. ", trailing "Leads ad", 16thMay vs 16 May,
// underscores vs spaces) so matching is similarity-based, never exact.

// ── CSV parsing ───────────────────────────────────────────────────────────────

/** Minimal RFC-4180-ish parser: handles quoted fields, escaped "" and CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export type CsvRow = {
  name: string;
  date: string; // 'YYYY-MM-DD'
  spend: number;
  leads: number;
};

export type ExtractResult = {
  rows: CsvRow[];
  /** Rows dropped because they had no ad name (e.g. the account total row). */
  skipped: number;
  /** Set when required columns are missing. */
  error?: string;
};

const num = (v: string | undefined): number => {
  const n = Number((v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** Pull the importable rows out of a raw CSV export. Column order is detected
 *  from the header, so reordered exports still work. */
export function extractRows(text: string): ExtractResult {
  const grid = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ""));
  if (grid.length < 2) return { rows: [], skipped: 0, error: "The file looks empty." };

  const header = grid[0].map((h) => h.trim().toLowerCase());
  const find = (pred: (h: string) => boolean) => header.findIndex(pred);

  const iName = find((h) => h === "ad name");
  const iSpend = find((h) => h.startsWith("amount spent"));
  const iLeads = find((h) => h === "leads");
  const iStart = find((h) => h === "reporting starts");

  if (iName < 0 || iSpend < 0 || iLeads < 0) {
    return {
      rows: [],
      skipped: 0,
      error: 'This doesn\'t look like an ads report (missing "Ad name", "Amount spent" or "Leads").',
    };
  }

  const rows: CsvRow[] = [];
  let skipped = 0;
  for (let r = 1; r < grid.length; r++) {
    const cells = grid[r];
    const name = (cells[iName] ?? "").trim();
    if (!name) {
      skipped++; // account-total row or any nameless row
      continue;
    }
    rows.push({
      name,
      date: (iStart >= 0 ? cells[iStart] : "")?.trim() || "",
      spend: num(cells[iSpend]),
      leads: Math.trunc(num(cells[iLeads])),
    });
  }
  return { rows, skipped };
}

// ── Name normalization + similarity ───────────────────────────────────────────

/** Strip the predictable noise so two names can be compared on their meaning. */
export function normalizeName(raw: string): string {
  let s = raw.replace(/([a-z])([A-Z])/g, "$1 $2"); // camelCase -> camel Case
  s = s.toLowerCase().trim();
  s = s.replace(/^\d+[.)]\s*/, ""); // leading "3. " / "2) "
  s = s.replace(/[_\-./]+/g, " "); // separators -> space
  s = s.replace(/(\d+)(st|nd|rd|th)/g, "$1"); // 16th -> 16 (even when glued to a word)
  s = s.replace(/[^a-z0-9 ]+/g, " "); // drop remaining punctuation
  s = s.replace(/(\d)([a-z])/g, "$1 $2"); // 16may -> 16 may
  s = s.replace(/([a-z])(\d)/g, "$1 $2"); // may16 -> may 16
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/\s+(leads?\s+)?ad$/, ""); // trailing Meta "ad" / "leads ad" suffix
  return s.trim();
}

const tokensOf = (norm: string): string[] => (norm ? norm.split(" ") : []);

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

function bigrams(s: string): Set<string> {
  const t = s.replace(/\s+/g, "");
  const set = new Set<string>();
  for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2));
  return set;
}

/** Sørensen–Dice coefficient over character bigrams. */
function dice(a: string, b: string): number {
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.size === 0 || B.size === 0) return a === b ? 1 : 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return (2 * inter) / (A.size + B.size);
}

/** 0..1 similarity between two raw ad names. Blends token-set overlap (robust to
 *  reordering / extra words) with character bigrams (robust to typos & date
 *  drift), and nudges by whether the brand token (first word) aligns. */
export function similarity(aRaw: string, bRaw: string): number {
  const a = normalizeName(aRaw);
  const b = normalizeName(bRaw);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const ta = tokensOf(a);
  const tb = tokensOf(b);
  let score = 0.6 * jaccard(ta, tb) + 0.4 * dice(a, b);

  const setA = new Set(ta);
  const setB = new Set(tb);
  if (ta[0] === tb[0]) score += 0.1; // same brand → boost
  else if (!setB.has(ta[0]) && !setA.has(tb[0])) score -= 0.12; // different brand → penalise

  return Math.max(0, Math.min(1, score));
}

// ── Matching ──────────────────────────────────────────────────────────────────

export type AdOption = { id: string; name: string };
export type Candidate = { adId: string; name: string; score: number };
export type Confidence = "strong" | "weak" | "none";

export type RowMatch = {
  row: CsvRow;
  candidates: Candidate[]; // best first, top few
  suggestedAdId: string | null; // pre-selected target (null = create new)
  confidence: Confidence;
};

// A strong match needs a high score AND a clear gap over the runner-up, so two
// similar ad names can't be confidently mixed up.
const STRONG = 0.78;
const WEAK = 0.34;
const MARGIN = 0.12;

export function matchRow(row: CsvRow, ads: AdOption[]): RowMatch {
  const candidates: Candidate[] = ads
    .map((ad) => ({ adId: ad.id, name: ad.name, score: similarity(row.name, ad.name) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, 5);

  const best = candidates[0];
  const second = candidates[1];
  let confidence: Confidence = "none";
  let suggestedAdId: string | null = null;

  // An exact (normalized) name match is unambiguous, so it doesn't need the
  // runner-up margin — as long as nothing else ties it at the same score.
  const isExact = !!best && best.score >= 0.999;
  const clearWinner = !second || best.score - second.score >= MARGIN;
  const exactWinner = isExact && (!second || second.score < best.score);

  if (best && best.score >= STRONG && (clearWinner || exactWinner)) {
    confidence = "strong";
    suggestedAdId = best.adId;
  } else if (best && best.score >= WEAK) {
    confidence = "weak";
    suggestedAdId = best.adId; // pre-fill the guess, but flag for review
  }

  return { row, candidates, suggestedAdId, confidence };
}

export function matchRows(rows: CsvRow[], ads: AdOption[]): RowMatch[] {
  return rows.map((row) => matchRow(row, ads));
}
