"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ClientDetail } from "@/lib/types";
import { formatYMD, fromYMD, monthLabel, startOfMonth, todayYMD } from "@/lib/dates";
import { ClientCalendar } from "@/components/clients/client-calendar";

const num = (n: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);

export function ClientDetailView({ detail }: { detail: ClientDetail }) {
  const today = todayYMD();
  const [day, setDay] = useState(today);

  const totals = useMemo(() => {
    let spend = 0;
    let leads = 0;
    for (const a of detail.ads) {
      spend += a.spend;
      leads += a.leads;
    }
    return { spend, leads };
  }, [detail.ads]);

  const month = useMemo(() => {
    const start = startOfMonth(today);
    let spend = 0;
    let leads = 0;
    for (const d of detail.daily) {
      if (d.date >= start && d.date <= today) {
        spend += d.spend;
        leads += d.leads;
      }
    }
    return { spend, leads };
  }, [detail.daily, today]);

  const dayTotals = useMemo(
    () => detail.daily.find((d) => d.date === day) ?? { spend: 0, leads: 0 },
    [detail.daily, day],
  );

  const datesWithData = useMemo(
    () => new Set(detail.daily.map((d) => d.date)),
    [detail.daily],
  );

  const runningCount = detail.ads.filter((a) => a.status === "running").length;
  const monthName = (() => {
    const d = fromYMD(today);
    return monthLabel(d.getFullYear(), d.getMonth());
  })();

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
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total spend" value={num(totals.spend)} />
        <StatCard label="Total leads" value={num(totals.leads)} />
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
            <h2 className="text-base font-semibold">This month</h2>
            <p className="mt-1 text-xs text-muted-foreground">{monthName}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Stat label="Spend" value={num(month.spend)} />
              <Stat label="Leads" value={num(month.leads)} />
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
                {running && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                )}
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
