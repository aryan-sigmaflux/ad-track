"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { AdListItem } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { AddMenu } from "@/components/main/add-menu";
import { AdsFilter } from "@/components/main/ads-filter";
import { AdsBoard } from "@/components/main/ads-board";
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

  const visibleIds = useMemo(() => new Set(filtered.map((a) => a.id)), [filtered]);

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

      {/* Board */}
      {ads.length === 0 ? (
        <section className="mt-5">
          <EmptyState />
        </section>
      ) : (
        <AdsBoard
          ads={ads}
          visibleIds={visibleIds}
          filtered={query.trim() !== "" || filtersActive}
        />
      )}

      <AddMenu ads={ads.map((a) => ({ id: a.id, name: a.name }))} clients={clientNames} />
    </>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full mt-10 flex flex-col items-center gap-1 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
      <p className="font-medium text-foreground">No ads yet</p>
      <p className="text-sm text-muted-foreground">Tap the + button to add your first ad.</p>
    </div>
  );
}
