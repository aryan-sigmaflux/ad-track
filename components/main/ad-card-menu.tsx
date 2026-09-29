"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2, MoreHorizontal, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { restartAd, stopAd } from "@/lib/ads/actions";
import { formatDMY, maskDMY, parseDMY, todayYMD } from "@/lib/dates";
import type { AdStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = { adId: string; adName: string; status: AdStatus };

/** Three-dot actions menu on an ad card. */
export function AdCardMenu({ adId, adName, status }: Props) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [stopOpen, setStopOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  // Stop date: today unless the user taps "Today" and types another (dd/mm/yy).
  const [customDate, setCustomDate] = useState(false);
  const [dateText, setDateText] = useState("");

  const running = status === "running";

  const turnOn = () => {
    startTransition(async () => {
      const res = await restartAd(adId, todayYMD());
      if (res.ok) {
        toast.success("Ad turned on");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const turnOff = () => {
    const today = todayYMD();
    const stopDate = customDate ? parseDMY(dateText) : today;
    if (!stopDate) {
      setError("Enter the stop date as dd/mm/yy.");
      return;
    }
    if (stopDate > today) {
      setError("The stop date can't be in the future.");
      return;
    }
    if (!reason.trim()) {
      setError("Please give a reason for turning this ad off.");
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await stopAd(adId, stopDate, reason);
      if (res.ok) {
        toast.success("Ad turned off");
        handleStopOpenChange(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  const handleStopOpenChange = (next: boolean) => {
    if (!next) {
      setReason("");
      setError("");
      setCustomDate(false);
      setDateText("");
    }
    setStopOpen(next);
  };

  return (
    // The card is draggable; keep pointer events from the menu, its popup and
    // the dialog (portals still bubble through the React tree) from starting a drag.
    <div onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label={`Actions for ${adName}`}
              disabled={busy}
              className="flex size-8 items-center justify-center rounded-full text-tertiary transition-colors hover:bg-secondary hover:text-foreground aria-expanded:bg-secondary aria-expanded:text-foreground disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MoreHorizontal className="size-[18px]" strokeWidth={1.5} />
              )}
            </button>
          }
        />
        <DropdownMenuContent align="end" className="w-44">
          {running ? (
            <DropdownMenuItem onClick={() => setStopOpen(true)}>
              <Pause strokeWidth={1.5} /> Turn off ad
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={turnOn}>
              <Play strokeWidth={1.5} /> Turn on ad
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={stopOpen} onOpenChange={handleStopOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Turn off ad</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{adName}</span> will stop running.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor={customDate ? `stop-date-${adId}` : undefined}>Stop date</Label>
            {customDate ? (
              <div className="flex items-center gap-2">
                <Input
                  id={`stop-date-${adId}`}
                  value={dateText}
                  onChange={(e) => setDateText(maskDMY(e.target.value))}
                  placeholder="dd/mm/yy"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={8}
                  autoFocus
                  className="flex-1 tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCustomDate(false);
                    setDateText("");
                  }}
                  className="h-8 shrink-0 rounded-full border border-border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Today
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCustomDate(true)}
                title="Pick a different date"
                className="flex h-10 w-fit items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <CalendarDays className="size-4" strokeWidth={1.5} />
                Today
                <span className="tabular-nums opacity-70">{formatDMY(todayYMD())}</span>
              </button>
            )}
            <p className="text-xs text-muted-foreground">
              {customDate ? "Type the date as dd/mm/yy." : "Tap Today to enter a different date."}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`stop-reason-${adId}`}>Reason</Label>
            <Textarea
              id={`stop-reason-${adId}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is it being turned off?"
              rows={3}
              maxLength={500}
              aria-invalid={error ? true : undefined}
            />
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <Button
            type="button"
            onClick={turnOff}
            disabled={busy || !reason.trim()}
            className="rounded-full"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Turn off ad"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
