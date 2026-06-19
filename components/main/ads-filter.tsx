"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ClientCombobox } from "@/components/main/client-combobox";
import { cn } from "@/lib/utils";
import type { StatusFilter } from "@/lib/filters";

type Props = {
  status: StatusFilter;
  onStatusChange: (s: StatusFilter) => void;
  clients: string[]; // available client values (NO_CLIENT sentinel for unset)
  selectedClients: string[];
  onToggleClient: (c: string) => void;
  onClear: () => void;
};

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "paused", label: "Paused" },
];

export function AdsFilter({
  status,
  onStatusChange,
  clients,
  selectedClients,
  onToggleClient,
  onClear,
}: Props) {
  const activeCount = (status !== "all" ? 1 : 0) + (selectedClients.length > 0 ? 1 : 0);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Filters"
            className="relative flex size-12 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground aria-expanded:border-foreground/20 aria-expanded:text-foreground"
          >
            <SlidersHorizontal className="size-[18px]" strokeWidth={1.5} />
            {activeCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </button>
        }
      />
      <PopoverContent align="end" className="w-72">
        {/* Status */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-tertiary">
          Status
        </p>
        <div className="grid grid-cols-3 gap-1 rounded-full bg-secondary p-1">
          {STATUS_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onStatusChange(o.value)}
              className={cn(
                "h-8 rounded-full text-sm font-medium transition-colors",
                status === o.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>

        <Separator className="my-4" />

        {/* Client / Company */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-tertiary">
          Client / Company
        </p>
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground">No clients yet.</p>
        ) : (
          <ClientCombobox
            clients={clients}
            selected={selectedClients}
            onToggle={onToggleClient}
          />
        )}

        <Separator className="my-4" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={activeCount === 0}
          onClick={onClear}
          className="w-full"
        >
          Clear filters
        </Button>
      </PopoverContent>
    </Popover>
  );
}
