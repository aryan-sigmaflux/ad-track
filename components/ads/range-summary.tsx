"use client";

import { useMemo, useState } from "react";
import type { AdDailyMetric } from "@/lib/types";
import {
  cpl,
  formatYMD,
  presetRange,
  RANGE_OPTIONS,
  todayYMD,
  type RangeKey,
} from "@/lib/dates";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const num = (n: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);

export function RangeSummary({ metrics }: { metrics: AdDailyMetric[] }) {
  const today = todayYMD();
  const [rangeKey, setRangeKey] = useState<RangeKey>("last30");
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);

  const { start, end } = useMemo(() => {
    if (rangeKey === "custom") return { start: customStart, end: customEnd };
    return presetRange(rangeKey, today);
  }, [rangeKey, customStart, customEnd, today]);

  const totals = useMemo(() => {
    const lo = start <= end ? start : end;
    const hi = start <= end ? end : start;
    let spend = 0;
    let leads = 0;
    for (const m of metrics) {
      if (m.date >= lo && m.date <= hi) {
        spend += m.spend;
        leads += m.leads;
      }
    }
    return { spend, leads, cpl: cpl(spend, leads) };
  }, [metrics, start, end]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Overview</h2>
        <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
          <SelectTrigger className="w-40 rounded-full" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((o) => (
              <SelectItem key={o.key} value={o.key}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rangeKey === "custom" && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="range-start" className="text-xs text-muted-foreground">From</Label>
            <Input
              id="range-start"
              type="date"
              value={customStart}
              max={customEnd}
              onChange={(e) => setCustomStart(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="range-end" className="text-xs text-muted-foreground">To</Label>
            <Input
              id="range-end"
              type="date"
              value={customEnd}
              min={customStart}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        {formatYMD(start <= end ? start : end)} – {formatYMD(start <= end ? end : start)}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Spend" value={num(totals.spend)} />
        <Stat label="Leads" value={num(totals.leads)} />
        <Stat label="CPL" value={totals.cpl === null ? "—" : num(totals.cpl)} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary px-3 py-3 text-center">
      <p className="text-[11px] uppercase tracking-wide text-tertiary">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
