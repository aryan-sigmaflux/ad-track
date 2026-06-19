"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
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

export function AddAdDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    createAd,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Ad added");
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <>
      {/* Floating add button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add new ad"
        className="group fixed bottom-7 left-1/2 z-40 flex size-15 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br from-brand to-primary text-primary-foreground shadow-[0_12px_30px_-6px_color-mix(in_oklch,var(--brand)_70%,transparent)] ring-1 ring-white/10 transition-transform duration-200 hover:scale-110 active:scale-95"
      >
        <span
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full bg-brand/40 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100"
        />
        <Plus className="size-7 transition-transform duration-300 group-hover:rotate-90" strokeWidth={2.5} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
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
    </>
  );
}
