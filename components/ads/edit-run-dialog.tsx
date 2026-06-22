"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteRunPeriod, updateRunPeriod } from "@/lib/ads/actions";
import type { AdRunPeriod } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Keyed by `run.id` from the parent, so a fresh run remounts this with new
// defaults; closing resets the fields back to the saved values.
export function EditRunDialog({
  run,
  open,
  onOpenChange,
}: {
  run: AdRunPeriod;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [start, setStart] = useState(run.start_date);
  const [end, setEnd] = useState(run.end_date ?? "");
  const [error, setError] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setStart(run.start_date);
      setEnd(run.end_date ?? "");
      setError("");
    }
    onOpenChange(next);
  };

  const save = () => {
    setError("");
    startTransition(async () => {
      const res = await updateRunPeriod(run.id, start, end || null);
      if (res.ok) {
        toast.success("Run updated");
        onOpenChange(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  const remove = () => {
    if (!confirm("Delete this run? Daily spend and leads you entered are kept.")) return;
    startTransition(async () => {
      const res = await deleteRunPeriod(run.id);
      if (res.ok) {
        toast.success("Run deleted");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit run</DialogTitle>
          <DialogDescription>Fix the dates, or delete a run added by accident.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="run-start">Start date</Label>
            <Input
              id="run-start"
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="run-end">End date</Label>
            <Input
              id="run-end"
              type="date"
              value={end}
              min={start}
              onChange={(e) => setEnd(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Leave empty if it&apos;s still running.</p>
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="button" onClick={save} disabled={busy} className="rounded-full">
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Save changes"}
          </Button>
        </div>

        <Separator />

        <Button
          type="button"
          variant="destructive"
          disabled={busy}
          onClick={remove}
          className="rounded-full"
        >
          <Trash2 className="size-4" strokeWidth={1.5} /> Delete this run
        </Button>
      </DialogContent>
    </Dialog>
  );
}
