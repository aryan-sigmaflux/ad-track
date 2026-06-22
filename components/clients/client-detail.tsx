"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ClientDetail } from "@/lib/types";
import { formatYMD, presetRange, todayYMD, type RangeKey } from "@/lib/dates";
import { ClientCalendar } from "@/components/clients/client-calendar";
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

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "lastWeek", label: "Last week" },
  { key: "last7", label: "Last 7 days" },
  { key: "lastMonth", label: "Last month" },
  { key: "last30", label: "Last 30 days" },
  { key: "custom", label: "Custom" },
];

export function ClientDetailView({ detail }: { detail: ClientDetail }) {
  const today = todayYMD();
  const [day, setDay] = useState(today);

  const [rangeKey, setRangeKey] = useState<RangeKey>("lastMonth");
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);

  const range = useMemo(() => {
    if (rangeKey === "custom") return { start: customStart, end: customEnd };
    return presetRange(rangeKey, today);
  }, [rangeKey, customStart, customEnd, today]);

  const rangeTotals = useMemo(() => {
    const lo = range.start <= range.end ? range.start : range.end;
    const hi = range.start <= range.end ? range.end : range.start;
    let spend = 0;
    let leads = 0;
    for (const d of detail.daily) {
      if (d.date >= lo && d.date <= hi) {
        spend += d.spend;
        leads += d.leads;
      }
    }
    return { spend, leads };
  }, [detail.daily, range]);

  const dayTotals = useMemo(
    () => detail.daily.find((d) => d.date === day) ?? { spend: 0, leads: 0 },
    [detail.daily, day],
  );

  const datesWithData = useMemo(
    () => new Set(detail.daily.map((d) => d.date)),
    [detail.daily],
  );

  const runningCount = detail.ads.filter((a) => a.status === "running").length;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-4 px-5 pb-16 md:px-8">
      {/* Header (frozen on scroll) */}
      <header className="sticky top-0 z-30 -mx-5 flex items-center gap-1 border-b border-border/60 bg-background/80 px-5 py-3 backdrop-blur-md md:-mx-8 md:px-8 md:py-4">
        <Link
          href="/"
          aria-label="Back"
          className="-ml-2 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ChevronLeft className="size-5" strokeWidth={1.5} />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight">{detail.label}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {detail.ads.length} {detail.ads.length === 1 ? "ad" : "ads"} · {runningCount} running
          </p>
        </div>
      </header>

      {/* Top-line totals */}
      <section className="grid grid-cols-2 gap-3">
        <StatCard label="Ads" value={String(detail.ads.length)} />
        <StatCard label="Running" value={String(runningCount)} />
      </section>

      {/* Calendar + this-month / selected-day breakdown */}
      <section className="grid gap-4 lg:grid-cols-5 lg:items-start">
        <div className="lg:col-span-3 lg:sticky lg:top-24">
          <ClientCalendar datesWithData={datesWithData} selected={day} onSelect={setDay} />
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <h2 className="text-base font-semibold">
              {day === today ? "Today" : formatYMD(day)}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Spend &amp; leads for this day</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Stat label="Spend" value={num(dayTotals.spend)} />
              <Stat label="Leads" value={num(dayTotals.leads)} />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Overview</h2>
              <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
                <SelectTrigger className="w-36 rounded-full" size="sm">
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
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="client-range-start" className="text-xs text-muted-foreground">
                    From
                  </Label>
                  <Input
                    id="client-range-start"
                    type="date"
                    value={customStart}
                    max={customEnd}
                    onChange={(e) => setCustomStart(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="client-range-end" className="text-xs text-muted-foreground">
                    To
                  </Label>
                  <Input
                    id="client-range-end"
                    type="date"
                    value={customEnd}
                    min={customStart}
                    onChange={(e) => setCustomEnd(e.target.value)}
                  />
                </div>
              </div>
            )}

            <p className="mt-2 text-xs text-muted-foreground">
              {formatYMD(range.start <= range.end ? range.start : range.end)} –{" "}
              {formatYMD(range.start <= range.end ? range.end : range.start)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Stat label="Spend" value={num(rangeTotals.spend)} />
              <Stat label="Leads" value={num(rangeTotals.leads)} />
            </div>
          </Card>
        </div>
      </section>

      {/* Every ad in this category */}
      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Ads</h2>
        {detail.ads.map((a) => {
          const running = a.status === "running";
          return (
            <Link
              key={a.id}
              href={`/ads/${a.id}`}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-[0_10px_24px_-8px_rgba(0,0,0,0.18)]"
            >
              <span
                aria-hidden
                className="relative mt-1.5 flex size-2 shrink-0 self-start"
                title={running ? "Running" : "Paused"}
              >
                <span
                  className={`relative inline-flex size-2 rounded-full ${
                    running ? "bg-success" : "bg-tertiary"
                  }`}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{a.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {num(a.spend)} spend · {num(a.leads)} {a.leads === 1 ? "lead" : "leads"}
                </p>
              </div>
              <ChevronRight
                className="size-4 shrink-0 text-tertiary transition-all group-hover:translate-x-0.5 group-hover:text-brand"
                strokeWidth={1.5}
              />
            </Link>
          );
        })}
      </section>
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      {children}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <p className="text-[11px] uppercase tracking-wide text-tertiary">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
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
