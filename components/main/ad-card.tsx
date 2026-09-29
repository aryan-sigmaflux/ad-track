"use client";

import type * as React from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import type { AdListItem } from "@/lib/types";
import { formatYMD } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { AdCardMenu } from "@/components/main/ad-card-menu";

type Props = {
  ad: AdListItem;
  index?: number;
  /** Rendered as the floating copy under the pointer while dragging. */
  overlay?: boolean;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

/** One ad as shown on the home board. The whole card links to the ad; the
 *  three-dot menu sits on top in the corner. */
export function AdCard({ ad, index = 0, overlay = false, className, style, ref, ...rest }: Props & {
  ref?: React.Ref<HTMLDivElement>;
}) {
  const running = ad.status === "running";
  return (
    <div
      ref={ref}
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms`, ...style }}
      className={cn(
        "group relative rounded-2xl border border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-[border-color,box-shadow,opacity] duration-200 hover:border-brand/30 hover:shadow-[0_10px_24px_-8px_rgba(0,0,0,0.18)]",
        overlay
          ? "cursor-grabbing border-brand/40 shadow-[0_16px_32px_-10px_rgba(0,0,0,0.25)]"
          : "animate-rise",
        className,
      )}
      {...rest}
    >
      <Link
        href={`/ads/${ad.id}`}
        draggable={false}
        className="flex items-center gap-3 rounded-2xl p-4 pr-12 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
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
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate font-semibold text-foreground">{ad.name}</p>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatYMD(ad.start_date)}
            </span>
          </div>
          <p className="truncate text-sm text-muted-foreground">{ad.client || "—"}</p>
        </div>
      </Link>

      <div className="absolute right-2 top-2.5">
        {overlay ? (
          <span className="flex size-8 items-center justify-center text-tertiary">
            <MoreHorizontal className="size-[18px]" strokeWidth={1.5} />
          </span>
        ) : (
          <AdCardMenu adId={ad.id} adName={ad.name} status={ad.status} />
        )}
      </div>
    </div>
  );
}
