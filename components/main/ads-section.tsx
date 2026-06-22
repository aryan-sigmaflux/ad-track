"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import type { AdListItem } from "@/lib/types";
import { formatYMD } from "@/lib/dates";
import { Input } from "@/components/ui/input";
import { AddMenu } from "@/components/main/add-menu";
import { AdsFilter } from "@/components/main/ads-filter";
import { NO_CLIENT, type StatusFilter } from "@/lib/filters";

export function AdsSection({ ads }: { ads: AdListItem[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  // Distinct client values for the filter (NO_CLIENT sentinel for unset).
  const clients = useMemo(() => {
    const set = new Set<string>();
    for (const a of ads) set.add(a.client?.trim() ? a.client : NO_CLIENT);
    return Array.from(set).sort((x, y) =>
      x === NO_CLIENT ? 1 : y === NO_CLIENT ? -1 : x.localeCompare(y),
    );
  }, [ads]);

  // Real client names (no sentinel) for the "add ad" picker.
  const clientNames = useMemo(
    () => clients.filter((c) => c !== NO_CLIENT),
    [clients],
  );

  const toggleClient = (c: string) =>
    setSelectedClients((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );

  const clearFilters = () => {
    setStatus("all");
    setSelectedClients([]);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ads.filter((a) => {
      if (q && !a.name.toLowerCase().includes(q) && !(a.client ?? "").toLowerCase().includes(q))
        return false;
      if (status === "running" && a.status !== "running") return false;
      if (status === "paused" && a.status !== "stopped") return false;
      if (selectedClients.length > 0) {
        const key = a.client?.trim() ? a.client : NO_CLIENT;
        if (!selectedClients.includes(key)) return false;
      }
      return true;
    });
  }, [ads, query, status, selectedClients]);

  const filtersActive = status !== "all" || selectedClients.length > 0;

  return (
    <>
      {/* Search + filter */}
      <div className="mt-5 flex max-w-2xl items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-tertiary"
            strokeWidth={1.5}
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ads, clients…"
            className="h-12 rounded-full bg-card pl-10"
            aria-label="Search ads"
          />
        </div>
        <AdsFilter
          status={status}
          onStatusChange={setStatus}
          clients={clients}
          selectedClients={selectedClients}
          onToggleClient={toggleClient}
          onClear={clearFilters}
        />
      </div>

      {/* List */}
      <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <EmptyState hasAds={ads.length > 0} filtered={query.trim() !== "" || filtersActive} />
        ) : (
          filtered.map((ad, i) => <AdRow key={ad.id} ad={ad} index={i} />)
        )}
      </section>

      <AddMenu ads={ads.map((a) => ({ id: a.id, name: a.name }))} clients={clientNames} />
    </>
  );
}

function AdRow({ ad, index }: { ad: AdListItem; index: number }) {
  const running = ad.status === "running";
  return (
    <Link
      href={`/ads/${ad.id}`}
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      className="group flex animate-rise items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-[0_10px_24px_-8px_rgba(0,0,0,0.18)]"
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
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate font-semibold text-foreground">{ad.name}</p>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatYMD(ad.start_date)}
          </span>
        </div>
        <p className="truncate text-sm text-muted-foreground">{ad.client || "—"}</p>
      </div>
      <ChevronRight
        className="size-4 shrink-0 text-tertiary transition-all group-hover:translate-x-0.5 group-hover:text-brand"
        strokeWidth={1.5}
      />
    </Link>
  );
}

function EmptyState({ hasAds, filtered }: { hasAds: boolean; filtered: boolean }) {
  return (
    <div className="col-span-full mt-10 flex flex-col items-center gap-1 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
      <p className="font-medium text-foreground">
        {filtered ? "No matches" : hasAds ? "No matches" : "No ads yet"}
      </p>
      <p className="text-sm text-muted-foreground">
        {filtered
          ? "Try adjusting your search or filters."
          : hasAds
            ? "Try a different search."
            : "Tap the + button to add your first ad."}
      </p>
    </div>
  );
}
