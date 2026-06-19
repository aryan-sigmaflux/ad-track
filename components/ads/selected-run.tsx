"use client";

import { useMemo } from "react";
import { CircleOff, Play, Square } from "lucide-react";
import type { AdDailyMetric, AdRunPeriod } from "@/lib/types";
import { cpl, formatYMD, fromYMD, todayYMD } from "@/lib/dates";

const num = (n: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);

function daysBetween(start: string, end: string): number {
  return Math.round((fromYMD(end).getTime() - fromYMD(start).getTime()) / 86_400_000) + 1;
}

export function SelectedRun({
  periods,
  metrics,
  selected,
}: {
  periods: AdRunPeriod[];
  metrics: AdDailyMetric[];
  selected: string;
}) {
  const today = todayYMD();

  // The run period that covers the selected date (open periods run through today).
  const run = periods.find(
    (p) => selected >= p.start_date && selected <= (p.end_date ?? today),
  );

  const effectiveEnd = run ? run.end_date ?? today : null;

  // Totals across the whole run period (start → effective end).
  const totals = useMemo(() => {
    if (!run || !effectiveEnd) return { spend: 0, leads: 0, cpl: null as number | null };
    let spend = 0;
    let leads = 0;
    for (const m of metrics) {
      if (m.date >= run.start_date && m.date <= effectiveEnd) {
        spend += m.spend;
        leads += m.leads;
      }
    }
    return { spend, leads, cpl: cpl(spend, leads) };
  }, [run, effectiveEnd, metrics]);

  if (!run || !effectiveEnd) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <p className="text-[11px] uppercase tracking-wide text-tertiary">Ad run</p>
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <CircleOff className="size-4 text-tertiary" strokeWidth={1.5} />
          Ad not running on {formatYMD(selected)}.
        </div>
      </div>
    );
  }

  const ongoing = run.end_date === null;
  const duration = daysBetween(run.start_date, effectiveEnd);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wide text-tertiary">Ad run</p>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            ongoing ? "bg-success/15 text-foreground" : "bg-secondary text-muted-foreground"
          }`}
        >
          {ongoing ? (
            <>
              <Play className="size-3 text-success" strokeWidth={2.5} /> Running
            </>
          ) : (
            <>
              <Square className="size-3" strokeWidth={2} /> Ended
            </>
          )}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-2 text-sm">
        <Row label="Started" value={formatYMD(run.start_date)} />
        <Row label="Ended" value={ongoing ? "Ongoing" : formatYMD(run.end_date!)} />
        <Row
          label="Duration"
          value={`${duration} day${duration === 1 ? "" : "s"}${ongoing ? " so far" : ""}`}
        />
      </div>

      {/* Totals for this run period */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Spend" value={num(totals.spend)} />
        <Stat label="Leads" value={num(totals.leads)} />
        <Stat label="CPL" value={totals.cpl === null ? "—" : num(totals.cpl)} />
      </div>

      {run.stop_reason ? (
        <div className="mt-3 rounded-xl bg-secondary px-3 py-2 text-sm">
          <p className="text-[11px] uppercase tracking-wide text-tertiary">Stop reason</p>
          <p className="mt-0.5">{run.stop_reason}</p>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary px-3 py-2.5 text-center">
      <p className="text-[11px] uppercase tracking-wide text-tertiary">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
