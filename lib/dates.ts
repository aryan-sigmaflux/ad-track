// Pure date helpers shared by client + server. Dates are handled as local
// 'YYYY-MM-DD' strings so there are no timezone off-by-one surprises.

export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromYMD(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayYMD(): string {
  return toYMD(new Date());
}

export function addDays(s: string, n: number): string {
  const d = fromYMD(s);
  d.setDate(d.getDate() + n);
  return toYMD(d);
}

/** Monday-based start of the week containing `s`. */
export function startOfWeek(s: string): string {
  const d = fromYMD(s);
  const dow = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - dow);
  return toYMD(d);
}

export function startOfMonth(s: string): string {
  const d = fromYMD(s);
  return toYMD(new Date(d.getFullYear(), d.getMonth(), 1));
}

export type RangeKey =
  | "last7"
  | "last30"
  | "lastWeek"
  | "lastMonth"
  | "thisWeek"
  | "thisMonth"
  | "custom";

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "last7", label: "Last 7 days" },
  { key: "last30", label: "Last 30 days" },
  { key: "thisWeek", label: "This week" },
  { key: "thisMonth", label: "This month" },
  { key: "custom", label: "Custom" },
];

/** Returns inclusive [start, end] YMD strings for a preset. */
export function presetRange(key: Exclude<RangeKey, "custom">, today = todayYMD()): {
  start: string;
  end: string;
} {
  switch (key) {
    case "last7":
      return { start: addDays(today, -6), end: today };
    case "last30":
      return { start: addDays(today, -29), end: today };
    case "lastWeek": {
      const weekStart = startOfWeek(today);
      return { start: addDays(weekStart, -7), end: addDays(weekStart, -1) };
    }
    case "lastMonth": {
      const d = fromYMD(today);
      return {
        start: toYMD(new Date(d.getFullYear(), d.getMonth() - 1, 1)),
        end: toYMD(new Date(d.getFullYear(), d.getMonth(), 0)),
      };
    }
    case "thisWeek":
      return { start: startOfWeek(today), end: today };
    case "thisMonth":
      return { start: startOfMonth(today), end: today };
  }
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthLabel(year: number, month0: number): string {
  return `${MONTHS[month0]} ${year}`;
}

/** Pretty date like "19 Jun 2026". */
export function formatYMD(s: string): string {
  const d = fromYMD(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

/** CPL = spend / leads, or null when leads is 0. */
export function cpl(spend: number, leads: number): number | null {
  return leads > 0 ? spend / leads : null;
}
