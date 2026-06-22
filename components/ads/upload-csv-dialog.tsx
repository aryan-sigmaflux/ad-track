"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  FilePlus2,
  Loader2,
  Search,
  Sparkles,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  importCsvMetrics,
  type CsvAssignment,
  type ConflictChoice,
  type MetricConflict,
} from "@/lib/ads/actions";
import {
  extractRows,
  matchRow,
  type AdOption,
  type Confidence,
  type CsvRow,
} from "@/lib/ads/csv-import";
import { formatYMD } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Per-ad target: an existing ad id, "new" (create), or "skip".
type Target = string | "new" | "skip";

// One row per distinct ad name in the CSV, carrying all of its days. The user
// assigns a target once per ad (not per day) — much faster than one row per day.
type ReviewGroup = {
  name: string;
  days: CsvRow[]; // sorted ascending by date
  spend: number; // total across days
  leads: number; // total across days
  confidence: Confidence;
  target: Target;
};

// Mirror of the server's conflict key (`${adId}|${date}`).
const conflictKey = (adId: string, date: string) => `${adId}|${date}`;

export function UploadCsvDialog({
  ads,
  open,
  onOpenChange,
}: {
  ads: AdOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [groups, setGroups] = useState<ReviewGroup[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [pending, setPending] = useState(false);
  // Set when the server reports (ad, day) rows that already have different data.
  const [conflicts, setConflicts] = useState<MetricConflict[] | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, ConflictChoice>>({});

  // Reset everything as the dialog closes (handled here, not in an effect).
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setGroups(null);
      setFileName("");
      setParseError("");
      setConflicts(null);
      setResolutions({});
      if (fileRef.current) fileRef.current.value = "";
    }
    onOpenChange(next);
  };

  const handleFile = async (file: File) => {
    setParseError("");
    const text = await file.text();
    const { rows: csvRows, error } = extractRows(text);
    if (error) {
      setParseError(error);
      return;
    }
    if (csvRows.length === 0) {
      setParseError("No ad rows found in this file.");
      return;
    }

    // Collapse the CSV's day-by-day rows into one entry per distinct ad name.
    const byName = new Map<string, CsvRow[]>();
    for (const r of csvRows) {
      const arr = byName.get(r.name) ?? [];
      arr.push(r);
      byName.set(r.name, arr);
    }

    // An existing ad can only be auto-assigned to one ad-group; if two different
    // names fuzzy-match the same ad, the later one falls back to "new".
    const claimed = new Set<string>();
    const built: ReviewGroup[] = [];
    for (const [name, days] of byName) {
      days.sort((a, b) => (a.date < b.date ? -1 : 1));
      const match = matchRow(days[0], ads); // name-based, so any day represents the group
      let target: Target = match.suggestedAdId ?? "new";
      if (target !== "new" && claimed.has(target)) target = "new";
      if (target !== "new") claimed.add(target);
      built.push({
        name,
        days,
        spend: days.reduce((s, d) => s + d.spend, 0),
        leads: days.reduce((s, d) => s + d.leads, 0),
        confidence: match.confidence,
        target,
      });
    }
    built.sort((a, b) => a.name.localeCompare(b.name));

    setFileName(file.name);
    setGroups(built);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const setTarget = (i: number, target: Target) =>
    setGroups((prev) => prev && prev.map((g, idx) => (idx === i ? { ...g, target } : g)));

  // An existing ad can only be claimed by one ad-group in a single upload.
  const usedAdIds = useMemo(() => {
    const used = new Map<string, number>();
    groups?.forEach((g, i) => {
      if (g.target !== "new" && g.target !== "skip") used.set(g.target, i);
    });
    return used;
  }, [groups]);

  const adCount = groups?.filter((g) => g.target !== "skip").length ?? 0;

  const items = useMemo<CsvAssignment[]>(
    () =>
      (groups ?? [])
        .filter((g) => g.target !== "skip")
        .flatMap((g) =>
          g.days.map((d) =>
            g.target === "new"
              ? { kind: "new", name: g.name, date: d.date, spend: d.spend, leads: d.leads }
              : { kind: "existing", adId: g.target, date: d.date, spend: d.spend, leads: d.leads },
          ),
        ),
    [groups],
  );

  const runImport = async (withResolutions: Record<string, ConflictChoice>) => {
    if (items.length === 0) return;
    setPending(true);
    const res = await importCsvMetrics(items, withResolutions);
    setPending(false);

    if (res.ok) {
      const parts = [`Imported ${res.count} ${res.count === 1 ? "day" : "days"} of data`];
      if (res.skipped > 0) parts.push(`${res.skipped} unchanged`);
      toast.success(parts.join(" · "));
      handleOpenChange(false);
      router.refresh();
      return;
    }
    if (res.conflicts && res.conflicts.length > 0) {
      // Default each conflict to "use CSV"; the user can flip any to "keep".
      setResolutions((prev) => {
        const next = { ...prev };
        for (const c of res.conflicts!) next[conflictKey(c.adId, c.date)] ??= "csv";
        return next;
      });
      setConflicts(res.conflicts);
      return;
    }
    toast.error(res.error);
  };

  const submit = () => runImport(resolutions);
  const confirmConflicts = () => {
    // Make sure every shown conflict carries a choice (default: use CSV).
    const complete = { ...resolutions };
    for (const c of conflicts ?? []) complete[conflictKey(c.adId, c.date)] ??= "csv";
    runImport(complete);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn(groups && "sm:max-w-2xl")}>
        <DialogHeader>
          <DialogTitle>{conflicts ? "Resolve conflicts" : "Upload a CSV"}</DialogTitle>
          <DialogDescription>
            {conflicts
              ? "These ads already have data for that day. Choose which value to keep for each."
              : groups
                ? "Check each ad was matched correctly, then import. Nothing is saved until you confirm."
                : "Upload an ads report. We'll fill in spend and leads for each ad and day."}
          </DialogDescription>
        </DialogHeader>

        {conflicts ? (
          <div className="-mx-1 max-h-[55vh] overflow-y-auto px-1">
            <div className="flex flex-col gap-2">
              {conflicts.map((c) => {
                const key = conflictKey(c.adId, c.date);
                return (
                  <ConflictCard
                    key={key}
                    conflict={c}
                    adName={ads.find((a) => a.id === c.adId)?.name ?? "This ad"}
                    choice={resolutions[key] ?? "csv"}
                    onChoose={(choice) => setResolutions((prev) => ({ ...prev, [key]: choice }))}
                  />
                );
              })}
            </div>
          </div>
        ) : !groups ? (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card/50 px-6 py-10 text-center transition-colors hover:border-brand/40 hover:bg-card"
            >
              <Upload className="size-7 text-tertiary" strokeWidth={1.5} />
              <span className="text-sm font-medium text-foreground">Choose a CSV file</span>
              <span className="text-xs text-muted-foreground">Meta / Facebook ads report export</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={onPick}
              className="hidden"
            />
            {parseError ? (
              <p className="text-sm text-destructive" role="alert">
                {parseError}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate">{fileName}</span>
              <span className="shrink-0">
                {groups.length} {groups.length === 1 ? "ad" : "ads"}
              </span>
            </div>

            <div className="-mx-1 max-h-[55vh] overflow-y-auto px-1">
              <div className="flex flex-col gap-2">
                {groups.map((g, i) => (
                  <ReviewGroupCard
                    key={g.name}
                    group={g}
                    ads={ads}
                    usedBy={usedAdIds}
                    selfIndex={i}
                    onChange={(t) => setTarget(i, t)}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {conflicts ? (
          <DialogFooter className="mt-1 items-center gap-2 sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => setConflicts(null)} disabled={pending}>
              Back
            </Button>
            <Button type="button" onClick={confirmConflicts} disabled={pending} className="rounded-full">
              {pending ? <Loader2 className="size-4 animate-spin" /> : "Apply and import"}
            </Button>
          </DialogFooter>
        ) : groups ? (
          <DialogFooter className="mt-1 items-center gap-2 sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => setGroups(null)} disabled={pending}>
              Back
            </Button>
            <Button type="button" onClick={submit} disabled={pending || adCount === 0} className="rounded-full">
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                `Import ${adCount} ${adCount === 1 ? "ad" : "ads"}`
              )}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ConflictCard({
  conflict,
  adName,
  choice,
  onChoose,
}: {
  conflict: MetricConflict;
  adName: string;
  choice: ConflictChoice;
  onChoose: (choice: ConflictChoice) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-sm font-medium text-foreground" title={adName}>
          {adName}
        </p>
        <span className="shrink-0 text-xs text-muted-foreground">{formatYMD(conflict.date)}</span>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <ConflictOption
          label="Keep current"
          spend={conflict.existing.spend}
          leads={conflict.existing.leads}
          active={choice === "keep"}
          onClick={() => onChoose("keep")}
        />
        <ConflictOption
          label="Use CSV"
          spend={conflict.incoming.spend}
          leads={conflict.incoming.leads}
          active={choice === "csv"}
          onClick={() => onChoose("csv")}
        />
      </div>
    </div>
  );
}

function ConflictOption({
  label,
  spend,
  leads,
  active,
  onClick,
}: {
  label: string;
  spend: number;
  leads: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-col gap-1 rounded-lg border p-2.5 text-left transition-colors",
        active ? "border-brand bg-brand/5" : "border-input hover:bg-secondary",
      )}
    >
      <span className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        {label}
        {active && <Check className="size-3.5 text-brand" strokeWidth={2} />}
      </span>
      <span className="text-sm text-foreground">
        {spend.toLocaleString()} spend · {leads} {leads === 1 ? "lead" : "leads"}
      </span>
    </button>
  );
}

function ReviewGroupCard({
  group,
  ads,
  usedBy,
  selfIndex,
  onChange,
}: {
  group: ReviewGroup;
  ads: AdOption[];
  usedBy: Map<string, number>;
  selfIndex: number;
  onChange: (t: Target) => void;
}) {
  const isNew = group.target === "new";
  const isSkip = group.target === "skip";
  const matchedAd = !isNew && !isSkip ? ads.find((a) => a.id === group.target) : undefined;

  const first = group.days[0].date;
  const last = group.days[group.days.length - 1].date;
  const range = first === last ? formatYMD(first) : `${formatYMD(first)} – ${formatYMD(last)}`;
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground" title={group.name}>
            {group.name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {group.days.length} {group.days.length === 1 ? "day" : "days"} · {range} · {fmt(group.spend)}{" "}
            spend · {group.leads} {group.leads === 1 ? "lead" : "leads"}
          </p>
        </div>
        <ConfidenceBadge confidence={group.confidence} isNew={isNew} isSkip={isSkip} />
      </div>

      <div className="mt-2.5">
        <AdPicker
          ads={ads}
          value={group.target}
          usedBy={usedBy}
          selfIndex={selfIndex}
          onChange={onChange}
          matchedName={matchedAd?.name}
        />
      </div>
    </div>
  );
}

function ConfidenceBadge({
  confidence,
  isNew,
  isSkip,
}: {
  confidence: Confidence;
  isNew: boolean;
  isSkip: boolean;
}) {
  if (isSkip)
    return <Badge className="bg-muted text-muted-foreground">Skipped</Badge>;
  if (isNew)
    return (
      <Badge className="bg-brand/10 text-brand">
        <FilePlus2 className="size-3" strokeWidth={2} /> New ad
      </Badge>
    );
  if (confidence === "strong")
    return (
      <Badge className="bg-success/10 text-success">
        <Sparkles className="size-3" strokeWidth={2} /> Matched
      </Badge>
    );
  return (
    <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-500">
      <TriangleAlert className="size-3" strokeWidth={2} /> Check
    </Badge>
  );
}

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

// Searchable picker: an existing ad (top matches surfaced first), "Create new ad",
// or "Skip". Ads already claimed by another ad-group are disabled.
function AdPicker({
  ads,
  value,
  usedBy,
  selfIndex,
  onChange,
  matchedName,
}: {
  ads: AdOption[];
  value: Target;
  usedBy: Map<string, number>;
  selfIndex: number;
  onChange: (t: Target) => void;
  matchedName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ads;
    return ads.filter((a) => a.name.toLowerCase().includes(q));
  }, [ads, search]);

  const label =
    value === "new" ? "Create new ad" : value === "skip" ? "Skip this ad" : (matchedName ?? "Select an ad");

  const choose = (t: Target) => {
    onChange(t);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-sm transition-colors hover:bg-secondary",
          value === "skip" && "text-muted-foreground",
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          strokeWidth={1.5}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-[0_4px_16px_rgba(0,0,0,0.10)]">
          <div className="relative border-b border-border">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-tertiary"
              strokeWidth={1.5}
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ads…"
              autoFocus
              className="h-9 rounded-none border-0 pl-8 shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="max-h-56 overflow-y-auto p-1">
            <Row active={value === "new"} onClick={() => choose("new")}>
              <FilePlus2 className="size-4 text-brand" strokeWidth={1.5} />
              <span>Create new ad</span>
            </Row>
            <Row active={value === "skip"} onClick={() => choose("skip")}>
              <span className="text-muted-foreground">Skip this ad</span>
            </Row>
            <div className="my-1 h-px bg-border" />

            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-sm text-muted-foreground">No ads</p>
            ) : (
              filtered.map((a) => {
                const claimedBy = usedBy.get(a.id);
                const takenByOther = claimedBy !== undefined && claimedBy !== selfIndex;
                return (
                  <Row
                    key={a.id}
                    active={value === a.id}
                    disabled={takenByOther}
                    onClick={() => !takenByOther && choose(a.id)}
                  >
                    <span className="truncate">{a.name}</span>
                    {value === a.id && <Check className="ml-auto size-4 text-brand" strokeWidth={2} />}
                    {takenByOther && (
                      <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">used</span>
                    )}
                  </Row>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  active,
  disabled,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
        disabled ? "cursor-not-allowed opacity-50" : "hover:bg-secondary",
        active && "bg-secondary",
      )}
    >
      {children}
    </button>
  );
}
