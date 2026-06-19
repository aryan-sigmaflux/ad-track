"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { NO_CLIENT } from "@/lib/filters";

const labelFor = (c: string) => (c === NO_CLIENT ? "No client" : c);

export function ClientCombobox({
  clients,
  selected,
  onToggle,
}: {
  clients: string[];
  selected: string[];
  onToggle: (c: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click.
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
    if (!q) return clients;
    return clients.filter((c) => labelFor(c).toLowerCase().includes(q));
  }, [clients, search]);

  const summary =
    selected.length === 0
      ? "All clients"
      : selected.length === 1
        ? labelFor(selected[0])
        : `${selected.length} selected`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-sm transition-colors hover:bg-secondary"
      >
        <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>
          {summary}
        </span>
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
              placeholder="Search clients…"
              autoFocus
              className="h-9 rounded-none border-0 pl-8 shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-sm text-muted-foreground">No matches</p>
            ) : (
              filtered.map((c) => {
                const checked = selected.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onToggle(c)}
                    className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm hover:bg-secondary"
                  >
                    <Checkbox checked={checked} className="pointer-events-none" tabIndex={-1} />
                    <span className="truncate">{labelFor(c)}</span>
                    {checked && <Check className="ml-auto size-4 text-brand" strokeWidth={2} />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
