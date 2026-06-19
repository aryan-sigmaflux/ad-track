"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Radio, Pencil, Square } from "lucide-react";
import type { AdDetail } from "@/lib/types";
import { formatYMD, todayYMD } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { AdCalendar } from "@/components/ads/ad-calendar";
import { SelectedRun } from "@/components/ads/selected-run";
import { DayDetail } from "@/components/ads/day-detail";
import { RangeSummary } from "@/components/ads/range-summary";
import { EditAdDialog } from "@/components/ads/edit-ad-dialog";

export function AdDetailView({ detail }: { detail: AdDetail }) {
  const { ad, status, periods, metrics, lastStopReason, lastStopDate } = detail;
  const [selected, setSelected] = useState(todayYMD());
  const [editOpen, setEditOpen] = useState(false);

  const metricsByDate = useMemo(() => {
    const map = new Map(metrics.map((m) => [m.date, m]));
    return map;
  }, [metrics]);

  const datesWithData = useMemo(() => new Set(metrics.map((m) => m.date)), [metrics]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 pb-12">
      {/* Header (frozen on scroll) */}
      <header className="sticky top-0 z-30 -mx-5 flex items-center justify-between gap-3 border-b border-border/60 bg-background/80 px-5 py-3 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-1">
          <Link
            href="/"
            aria-label="Back"
            className="-ml-2 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronLeft className="size-5" strokeWidth={1.5} />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight">{ad.name}</h1>
            <p className="truncate text-sm text-muted-foreground">
              {ad.client || "—"} · from {formatYMD(ad.start_date)}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEditOpen(true)}
          className="shrink-0 rounded-full"
        >
          <Pencil className="size-3.5" strokeWidth={1.5} /> Edit
        </Button>
      </header>

      {/* Status */}
      <div
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
          status === "running"
            ? "border-success/30 bg-success/10 text-foreground"
            : "border-border bg-secondary text-foreground"
        }`}
      >
        {status === "running" ? (
          <Radio className="size-4 text-success" strokeWidth={1.75} />
        ) : (
          <Square className="size-4 text-tertiary" strokeWidth={1.5} />
        )}
        {status === "running" ? (
          <span className="font-medium">Currently running</span>
        ) : (
          <span>
            Stopped
            {lastStopDate ? ` on ${formatYMD(lastStopDate)}` : ""}
            {lastStopReason ? ` — ${lastStopReason}` : ""}
          </span>
        )}
      </div>

      <div className="animate-rise" style={{ animationDelay: "40ms" }}>
        <AdCalendar
          periods={periods}
          datesWithData={datesWithData}
          selected={selected}
          onSelect={setSelected}
        />
      </div>

      <div className="animate-rise" style={{ animationDelay: "90ms" }}>
        <SelectedRun periods={periods} metrics={metrics} selected={selected} />
      </div>

      <div className="animate-rise" style={{ animationDelay: "140ms" }}>
        <DayDetail adId={ad.id} date={selected} metric={metricsByDate.get(selected)} />
      </div>

      <div className="animate-rise" style={{ animationDelay: "190ms" }}>
        <RangeSummary metrics={metrics} />
      </div>

      <EditAdDialog ad={ad} status={status} open={editOpen} onOpenChange={setEditOpen} />
    </main>
  );
}
