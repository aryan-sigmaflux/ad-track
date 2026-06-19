"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteMetric, upsertMetric } from "@/lib/ads/actions";
import { formatYMD } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  adId: string;
  date: string;
  spend: number | null;
  leads: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MetricDialog({ adId, date, spend, leads, open, onOpenChange }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [spendVal, setSpendVal] = useState("");
  const [leadsVal, setLeadsVal] = useState("");

  const hasExisting = spend !== null || leads !== null;

  useEffect(() => {
    if (open) {
      setSpendVal(spend !== null ? String(spend) : "");
      setLeadsVal(leads !== null ? String(leads) : "");
    }
  }, [open, spend, leads]);

  const save = () => {
    const s = Number(spendVal || 0);
    const l = Number(leadsVal || 0);
    startTransition(async () => {
      const res = await upsertMetric(adId, date, s, Math.trunc(l));
      if (res.ok) {
        toast.success("Saved");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const clear = () => {
    startTransition(async () => {
      const res = await deleteMetric(adId, date);
      if (res.ok) {
        toast.success("Cleared");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{formatYMD(date)}</DialogTitle>
          <DialogDescription>Enter the spend and leads for this day.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="spend">Spend</Label>
            <Input
              id="spend"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={spendVal}
              onChange={(e) => setSpendVal(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="leads">Leads</Label>
            <Input
              id="leads"
              type="number"
              inputMode="numeric"
              min={0}
              step="1"
              value={leadsVal}
              onChange={(e) => setLeadsVal(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <DialogFooter className="mt-1 gap-2 sm:justify-between">
          {hasExisting ? (
            <Button
              type="button"
              variant="ghost"
              onClick={clear}
              disabled={pending}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" strokeWidth={1.5} /> Clear
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={save} disabled={pending} className="rounded-full">
            {pending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
