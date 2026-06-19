"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { AdRunPeriod } from "@/lib/types";
import { addDays, monthLabel, toYMD, todayYMD } from "@/lib/dates";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Props = {
  periods: AdRunPeriod[];
  datesWithData: Set<string>;
  selected: string;
  onSelect: (ymd: string) => void;
};

export function AdCalendar({ periods, datesWithData, selected, onSelect }: Props) {
  const today = todayYMD();
  const sel = new Date(selected);
  const [view, setView] = useState({ year: sel.getFullYear(), month: sel.getMonth() });

  // Effective ranges: open periods run through today (and stay "open" on the right).
  const ranges = useMemo(
    () =>
      periods.map((p) => ({
        start: p.start_date,
        end: p.end_date ?? today,
        open: p.end_date === null,
      })),
    [periods, today],
  );

  const isRunning = (ymd: string) =>
    ranges.some((r) => ymd >= r.start && ymd <= r.end);

  const rangeFor = (ymd: string) =>
    ranges.find((r) => ymd >= r.start && ymd <= r.end);

  const goMonth = (delta: number) =>
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  const goYear = (delta: number) =>
    setView((v) => ({ ...v, year: v.year + delta }));

  // Build the grid: leading blanks (Monday-based) + days of month.
  const firstDow = (new Date(view.year, view.month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toYMD(new Date(view.year, view.month, d)));

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      {/* Month / year nav */}
      <div className="mb-3 flex items-center justify-between">
        <NavButton label="Previous year" onClick={() => goYear(-1)}>
          <ChevronsLeft className="size-4" strokeWidth={1.5} />
        </NavButton>
        <NavButton label="Previous month" onClick={() => goMonth(-1)}>
          <ChevronLeft className="size-4" strokeWidth={1.5} />
        </NavButton>
        <p className="min-w-36 text-center text-sm font-semibold">
          {monthLabel(view.year, view.month)}
        </p>
        <NavButton label="Next month" onClick={() => goMonth(1)}>
          <ChevronRight className="size-4" strokeWidth={1.5} />
        </NavButton>
        <NavButton label="Next year" onClick={() => goYear(1)}>
          <ChevronsRight className="size-4" strokeWidth={1.5} />
        </NavButton>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1 text-[11px] font-medium text-tertiary">
            {w}
          </span>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7">
        {cells.map((ymd, i) => {
          if (!ymd) return <span key={`b${i}`} className="aspect-square" />;

          const isToday = ymd === today;
          const isFuture = ymd > today;
          const isSelected = ymd === selected;
          const r = rangeFor(ymd);
          const running = !!r;
          const hasData = datesWithData.has(ymd);

          // Range band caps: round only at the true run start/end. At a gap or
          // week wrap the band runs flush to the cell edge so it reads continuous.
          const prevRunning = isRunning(addDays(ymd, -1));
          const nextRunning = isRunning(addDays(ymd, 1));
          const ongoingEnd = !!r?.open && ymd === r.end; // live today → leave open
          const leftCap = running && !prevRunning;
          const rightCap = running && !nextRunning && !ongoingEnd;

          return (
            <button
              key={ymd}
              type="button"
              disabled={isFuture}
              onClick={() => onSelect(ymd)}
              className={cn(
                "group relative aspect-square select-none",
                isFuture ? "cursor-default" : "cursor-pointer",
              )}
              aria-label={ymd}
              aria-pressed={isSelected}
            >
              {/* range band (covers the whole date) */}
              {running && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-y-1.5 left-0 right-0 border-y border-brand/45 bg-brand/15 transition-colors",
                    leftCap && "left-1.5 rounded-l-full border-l",
                    rightCap && "right-1.5 rounded-r-full border-r",
                  )}
                />
              )}

              {/* date number */}
              <span
                className={cn(
                  "absolute left-1/2 top-1/2 z-10 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-sm transition-all duration-150 group-hover:scale-110",
                  isSelected && "scale-105 bg-primary font-semibold text-primary-foreground shadow-md",
                  !isSelected && isToday && "border-2 border-brand font-semibold text-foreground",
                  !isSelected && !isToday && running && "font-semibold text-foreground",
                  !isSelected && !isToday && !running && isFuture && "text-tertiary",
                  !isSelected && !isToday && !running && !isFuture && "text-foreground",
                  !isSelected && !isFuture && "group-hover:bg-secondary",
                )}
              >
                {Number(ymd.slice(8))}
              </span>

              {/* has-data dot */}
              {hasData && !isSelected && (
                <span
                  aria-hidden
                  className="absolute bottom-3 left-1/2 z-10 size-1 -translate-x-1/2 rounded-full bg-foreground/55"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-6 rounded-full border border-brand/45 bg-brand/15" /> Running
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3.5 rounded-full border-2 border-brand" /> Today
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-foreground/55" /> Has data
        </span>
      </div>
    </div>
  );
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {children}
    </button>
  );
}
