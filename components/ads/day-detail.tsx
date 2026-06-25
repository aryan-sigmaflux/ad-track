"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import type { AdDailyMetric } from "@/lib/types";
import { cpl, formatYMD } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { MetricDialog } from "@/components/ads/metric-dialog";

const num = (n: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);

export function DayDetail({
  adId,
  date,
  metric,
}: {
  adId: string;
  date: string;
  metric: AdDailyMetric | undefined;
}) {
  const [open, setOpen] = useState(false);
  const c = metric ? cpl(metric.spend, metric.leads) : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-tertiary">Selected day</p>
          <p className="font-semibold">{formatYMD(date)}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="rounded-full"
        >
          {metric ? (
            <>
              <Pencil className="size-3.5" strokeWidth={1.5} /> Edit
            </>
          ) : (
            <>
              <Plus className="size-3.5" strokeWidth={1.5} /> Add data
            </>
          )}
        </Button>
      </div>

      {metric ? (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label="Spend" value={num(metric.spend)} />
            <Stat label="Leads" value={num(metric.leads)} />
            <Stat label="CPL" value={c === null ? "—" : num(c)} />
          </div>
          {metric.remarks ? (
            <div className="mt-3 rounded-xl bg-secondary px-3 py-2 text-sm">
              <p className="text-[11px] uppercase tracking-wide text-tertiary">Remarks</p>
              <p className="mt-0.5 whitespace-pre-wrap">{metric.remarks}</p>
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No data recorded for this day.</p>
      )}

      <MetricDialog
        adId={adId}
        date={date}
        spend={metric ? metric.spend : null}
        leads={metric ? metric.leads : null}
        remarks={metric ? metric.remarks : null}
        open={open}
        onOpenChange={setOpen}
      />
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
