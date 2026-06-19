"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");
  return session;
}

/** Throws unless the ad exists and belongs to the user. */
async function assertOwnedAd(supabase: SupabaseClient, adId: string, userId: string) {
  const { data } = await supabase
    .from("ads")
    .select("id")
    .eq("id", adId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new Error("Ad not found");
}

function cleanText(v: FormDataEntryValue | null, max = 200): string {
  return String(v ?? "").trim().slice(0, max);
}

// ── Ads ──────────────────────────────────────────────────────────────────────

export async function createAd(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const { userId } = await requireUser();
    const name = cleanText(formData.get("name"));
    const client = cleanText(formData.get("client"));
    const start_date = cleanText(formData.get("start_date"), 10);

    if (!name) return { ok: false, error: "Ad name is required." };
    if (!start_date) return { ok: false, error: "Start date is required." };

    const supabase = createAdminClient();
    const { data: ad, error } = await supabase
      .from("ads")
      .insert({ user_id: userId, name, client: client || null, start_date })
      .select("id")
      .single();

    if (error || !ad) return { ok: false, error: "Could not create the ad." };

    // Open an initial run period from the start date (ad is running by default).
    await supabase.from("ad_run_periods").insert({ ad_id: ad.id, start_date, end_date: null });

    revalidatePath("/");
    return { ok: true, id: ad.id };
  } catch {
    return { ok: false, error: "Something went wrong." };
  }
}

export async function updateAd(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const { userId } = await requireUser();
    const id = cleanText(formData.get("id"), 40);
    const name = cleanText(formData.get("name"));
    const client = cleanText(formData.get("client"));
    const start_date = cleanText(formData.get("start_date"), 10);

    if (!id) return { ok: false, error: "Missing ad id." };
    if (!name) return { ok: false, error: "Ad name is required." };
    if (!start_date) return { ok: false, error: "Start date is required." };

    const supabase = createAdminClient();
    await assertOwnedAd(supabase, id, userId);

    const { error } = await supabase
      .from("ads")
      .update({ name, client: client || null, start_date })
      .eq("id", id);

    if (error) return { ok: false, error: "Could not save changes." };

    revalidatePath("/");
    revalidatePath(`/ads/${id}`);
    return { ok: true, id };
  } catch {
    return { ok: false, error: "Something went wrong." };
  }
}

export async function deleteAd(adId: string): Promise<ActionResult> {
  try {
    const { userId } = await requireUser();
    const supabase = createAdminClient();
    await assertOwnedAd(supabase, adId, userId);
    const { error } = await supabase.from("ads").delete().eq("id", adId);
    if (error) return { ok: false, error: "Could not delete the ad." };
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "Something went wrong." };
  }
}

// ── Run periods (stop / restart) ─────────────────────────────────────────────

export async function stopAd(adId: string, endDate: string, reason: string): Promise<ActionResult> {
  try {
    const { userId } = await requireUser();
    const supabase = createAdminClient();
    await assertOwnedAd(supabase, adId, userId);

    const cleanReason = reason.trim().slice(0, 500);
    if (!cleanReason) return { ok: false, error: "A stop reason is required." };
    if (!endDate) return { ok: false, error: "A stop date is required." };

    // Close the currently-open period.
    const { data: open } = await supabase
      .from("ad_run_periods")
      .select("id, start_date")
      .eq("ad_id", adId)
      .is("end_date", null)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!open) return { ok: false, error: "This ad is not currently running." };
    if (endDate < open.start_date)
      return { ok: false, error: "Stop date can't be before the run started." };

    const { error } = await supabase
      .from("ad_run_periods")
      .update({ end_date: endDate, stop_reason: cleanReason })
      .eq("id", open.id);

    if (error) return { ok: false, error: "Could not stop the ad." };

    revalidatePath("/");
    revalidatePath(`/ads/${adId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Something went wrong." };
  }
}

export async function restartAd(adId: string, startDate: string): Promise<ActionResult> {
  try {
    const { userId } = await requireUser();
    const supabase = createAdminClient();
    await assertOwnedAd(supabase, adId, userId);

    if (!startDate) return { ok: false, error: "A restart date is required." };

    // Don't allow a second open period.
    const { data: open } = await supabase
      .from("ad_run_periods")
      .select("id")
      .eq("ad_id", adId)
      .is("end_date", null)
      .maybeSingle();
    if (open) return { ok: false, error: "This ad is already running." };

    const { error } = await supabase
      .from("ad_run_periods")
      .insert({ ad_id: adId, start_date: startDate, end_date: null });

    if (error) return { ok: false, error: "Could not restart the ad." };

    revalidatePath("/");
    revalidatePath(`/ads/${adId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Something went wrong." };
  }
}

// ── Daily metrics ────────────────────────────────────────────────────────────

export async function upsertMetric(
  adId: string,
  date: string,
  spend: number,
  leads: number,
): Promise<ActionResult> {
  try {
    const { userId } = await requireUser();
    const supabase = createAdminClient();
    await assertOwnedAd(supabase, adId, userId);

    if (!date) return { ok: false, error: "A date is required." };
    if (!Number.isFinite(spend) || spend < 0) return { ok: false, error: "Spend must be 0 or more." };
    if (!Number.isInteger(leads) || leads < 0) return { ok: false, error: "Leads must be a whole number." };

    const { error } = await supabase
      .from("ad_daily_metrics")
      .upsert({ ad_id: adId, date, spend, leads }, { onConflict: "ad_id,date" });

    if (error) return { ok: false, error: "Could not save the data." };

    revalidatePath(`/ads/${adId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Something went wrong." };
  }
}

export async function deleteMetric(adId: string, date: string): Promise<ActionResult> {
  try {
    const { userId } = await requireUser();
    const supabase = createAdminClient();
    await assertOwnedAd(supabase, adId, userId);

    const { error } = await supabase
      .from("ad_daily_metrics")
      .delete()
      .eq("ad_id", adId)
      .eq("date", date);

    if (error) return { ok: false, error: "Could not clear the data." };

    revalidatePath(`/ads/${adId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Something went wrong." };
  }
}
