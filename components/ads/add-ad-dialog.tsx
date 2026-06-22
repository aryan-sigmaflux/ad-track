"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createAd, type ActionResult } from "@/lib/ads/actions";
import { todayYMD } from "@/lib/dates";
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

export function AddAdDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    createAd,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Ad added");
      onOpenChange(false);
      router.refresh();
    }
  }, [state, router, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New ad</DialogTitle>
          <DialogDescription>Add a campaign to start tracking it.</DialogDescription>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Summer sale promo" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="client">Client / Company</Label>
            <Input id="client" name="client" placeholder="Acme Inc." />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="start_date">Start date</Label>
            <Input id="start_date" name="start_date" type="date" defaultValue={todayYMD()} required />
          </div>

          {state && !state.ok ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          <DialogFooter className="mt-1">
            <Button type="submit" disabled={pending} className="h-11 rounded-full">
              {pending ? <Loader2 className="size-4 animate-spin" /> : "Add ad"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
