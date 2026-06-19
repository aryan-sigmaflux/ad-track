"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pause, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteAd,
  restartAd,
  stopAd,
  updateAd,
  type ActionResult,
} from "@/lib/ads/actions";
import { todayYMD } from "@/lib/dates";
import type { Ad, AdStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  ad: Ad;
  status: AdStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditAdDialog({ ad, status, open, onOpenChange }: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    updateAd,
    null,
  );
  const [busy, startTransition] = useTransition();

  const [stopDate, setStopDate] = useState(todayYMD());
  const [stopReason, setStopReason] = useState("");
  const [restartDate, setRestartDate] = useState(todayYMD());

  useEffect(() => {
    if (state?.ok) {
      toast.success("Changes saved");
      onOpenChange(false);
      router.refresh();
    }
  }, [state, router, onOpenChange]);

  const handleStop = () => {
    startTransition(async () => {
      const res = await stopAd(ad.id, stopDate, stopReason);
      if (res.ok) {
        toast.success("Ad stopped");
        setStopReason("");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleRestart = () => {
    startTransition(async () => {
      const res = await restartAd(ad.id, restartDate);
      if (res.ok) {
        toast.success("Ad restarted");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("Delete this ad and all of its data? This cannot be undone.")) return;
    startTransition(async () => {
      const res = await deleteAd(ad.id);
      if (res.ok) {
        toast.success("Ad deleted");
        router.push("/");
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit ad</DialogTitle>
          <DialogDescription>Update details, change status, or delete.</DialogDescription>
        </DialogHeader>

        {/* Details */}
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={ad.id} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" name="name" defaultValue={ad.name} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-client">Client / Company</Label>
            <Input id="edit-client" name="client" defaultValue={ad.client ?? ""} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-start">Start date</Label>
            <Input id="edit-start" name="start_date" type="date" defaultValue={ad.start_date} required />
          </div>
          {state && !state.ok ? (
            <p className="text-sm text-destructive" role="alert">{state.error}</p>
          ) : null}
          <Button type="submit" disabled={pending} className="rounded-full">
            {pending ? <Loader2 className="size-4 animate-spin" /> : "Save changes"}
          </Button>
        </form>

        <Separator />

        {/* Status */}
        {status === "running" ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Stop this ad</p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="stop-date" className="text-xs text-muted-foreground">Stop date</Label>
              <Input
                id="stop-date"
                type="date"
                value={stopDate}
                max={todayYMD()}
                onChange={(e) => setStopDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="stop-reason" className="text-xs text-muted-foreground">Reason</Label>
              <Textarea
                id="stop-reason"
                value={stopReason}
                onChange={(e) => setStopReason(e.target.value)}
                placeholder="Why is it being stopped?"
                rows={2}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={handleStop}
              className="rounded-full"
            >
              <Pause className="size-4" strokeWidth={1.5} /> Stop ad
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Restart this ad</p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="restart-date" className="text-xs text-muted-foreground">Restart date</Label>
              <Input
                id="restart-date"
                type="date"
                value={restartDate}
                onChange={(e) => setRestartDate(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={handleRestart}
              className="rounded-full"
            >
              <Play className="size-4" strokeWidth={1.5} /> Restart ad
            </Button>
          </div>
        )}

        <Separator />

        <Button
          type="button"
          variant="destructive"
          disabled={busy}
          onClick={handleDelete}
          className="rounded-full"
        >
          <Trash2 className="size-4" strokeWidth={1.5} /> Delete ad
        </Button>
      </DialogContent>
    </Dialog>
  );
}
