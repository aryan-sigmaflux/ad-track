"use client";

import { useEffect, useState } from "react";
import { FileUp, Plus, SquarePen } from "lucide-react";
import type { AdOption } from "@/lib/ads/csv-import";
import { AddAdDialog } from "@/components/ads/add-ad-dialog";
import { UploadCsvDialog } from "@/components/ads/upload-csv-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AddMenu({ ads, clients }: { ads: AdOption[]; clients: string[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  // The trigger is centered on mobile but bottom-right on desktop, so the menu
  // aligns to match: centered over the circle, end-aligned under the pill.
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label="Add"
              className="group fixed bottom-7 left-1/2 z-40 flex size-15 -translate-x-1/2 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-brand to-primary text-primary-foreground shadow-[0_12px_30px_-6px_color-mix(in_oklch,var(--brand)_70%,transparent)] ring-1 ring-white/10 transition-transform duration-200 hover:scale-105 active:scale-95 md:bottom-8 md:left-auto md:right-8 md:size-auto md:translate-x-0 md:px-6 md:py-4"
            >
              <span
                aria-hidden
                className="absolute inset-0 -z-10 rounded-full bg-brand/40 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100"
              />
              <Plus
                className="size-7 transition-transform duration-300 group-data-[popup-open]:rotate-90 md:size-5"
                strokeWidth={2.5}
              />
              <span className="hidden text-[15px] font-semibold md:inline">New</span>
            </button>
          }
        />
        <DropdownMenuContent
          side="top"
          align={isDesktop ? "end" : "center"}
          sideOffset={12}
          className="w-52"
        >
          <DropdownMenuItem onClick={() => setAddOpen(true)}>
            <SquarePen className="size-4" strokeWidth={1.5} />
            Add a new ad
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setUploadOpen(true)}>
            <FileUp className="size-4" strokeWidth={1.5} />
            Upload a CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddAdDialog open={addOpen} onOpenChange={setAddOpen} clients={clients} />
      <UploadCsvDialog ads={ads} open={uploadOpen} onOpenChange={setUploadOpen} />
    </>
  );
}
