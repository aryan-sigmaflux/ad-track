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

/** Edit a run period's start/end dates. An empty `endDate` makes it ongoing. */
export async function updateRunPeriod(
  periodId: string,
  startDate: string,
  endDate: string | null,
): Promise<ActionResult> {
  try {
    const { userId } = await requireUser();
    const supabase = createAdminClient();

    const { data: period } = await supabase
      .from("ad_run_periods")
      .select("id, ad_id")
      .eq("id", periodId)
      .maybeSingle();
    if (!period) return { ok: false, error: "Run not found." };
    await assertOwnedAd(supabase, period.ad_id, userId);

    const start = String(startDate).slice(0, 10);
    const end = endDate ? String(endDate).slice(0, 10) : null;
    if (!start) return { ok: false, error: "A start date is required." };
    if (end && end < start)
      return { ok: false, error: "End date can't be before the start date." };

    // The ad can only have one open (still-running) period at a time.
    if (end === null) {
      const { data: otherOpen } = await supabase
        .from("ad_run_periods")
        .select("id")
        .eq("ad_id", period.ad_id)
        .is("end_date", null)
        .neq("id", periodId)
        .maybeSingle();
      if (otherOpen)
        return { ok: false, error: "This ad already has another running period. End it first." };
    }

    const update: { start_date: string; end_date: string | null; stop_reason?: null } = {
      start_date: start,
      end_date: end,
    };
    if (end === null) update.stop_reason = null; // constraint: a reason requires an end date

    const { error } = await supabase.from("ad_run_periods").update(update).eq("id", periodId);
    if (error) return { ok: false, error: "Could not update the run." };

    revalidatePath("/");
    revalidatePath(`/ads/${period.ad_id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Something went wrong." };
  }
}

/** Delete a single run period (e.g. one created by accident). */
export async function deleteRunPeriod(periodId: string): Promise<ActionResult> {
  try {
    const { userId } = await requireUser();
    const supabase = createAdminClient();

    const { data: period } = await supabase
      .from("ad_run_periods")
      .select("id, ad_id")
      .eq("id", periodId)
      .maybeSingle();
    if (!period) return { ok: false, error: "Run not found." };
    await assertOwnedAd(supabase, period.ad_id, userId);

    const { error } = await supabase.from("ad_run_periods").delete().eq("id", periodId);
    if (error) return { ok: false, error: "Could not delete the run." };

    revalidatePath("/");
    revalidatePath(`/ads/${period.ad_id}`);
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

// ── CSV import ───────────────────────────────────────────────────────────────

export type CsvAssignment =
  | { kind: "existing"; adId: string; date: string; spend: number; leads: number }
  | { kind: "new"; name: string; date: string; spend: number; leads: number };

/** A row whose (ad, day) already has different data in the database. The user
 *  must pick which value to keep before the import can proceed. */
export type MetricConflict = {
  adId: string;
  date: string;
  existing: { spend: number; leads: number };
  incoming: { spend: number; leads: number };
};

/** Per-conflict choice, keyed by `${adId}|${date}`: keep the existing (manually
 *  entered) value, or overwrite it with the CSV value. */
export type ConflictChoice = "keep" | "csv";

export type ImportResult =
  | { ok: true; count: number; skipped: number }
  | { ok: false; error: string; conflicts?: MetricConflict[] };

const conflictKey = (adId: string, date: string) => `${adId}|${date}`;
const spendsEqual = (a: number, b: number) => Math.abs(a - b) < 0.005;

/** Apply a reviewed CSV upload. For each "existing" target whose (ad, day)
 *  already has data: identical values are skipped, and differing values are
 *  returned as conflicts (nothing is written) unless the caller passed a choice
 *  in `resolutions`. "new" rows create their ad and never conflict. */
export async function importCsvMetrics(
  items: CsvAssignment[],
  resolutions: Record<string, ConflictChoice> = {},
): Promise<ImportResult> {
  try {
    const { userId } = await requireUser();
    if (items.length === 0) return { ok: false, error: "Nothing to import." };

    const supabase = createAdminClient();

    // Validate every "existing" target belongs to this user (one query).
    const existingItems = items.filter(
      (i): i is Extract<CsvAssignment, { kind: "existing" }> => i.kind === "existing",
    );
    const existingIds = Array.from(new Set(existingItems.map((i) => i.adId)));
    if (existingIds.length > 0) {
      const { data: owned, error: ownedError } = await supabase
        .from("ads")
        .select("id")
        .eq("user_id", userId)
        .in("id", existingIds);
      if (ownedError) console.error("[importCsvMetrics] ownership query failed:", ownedError);
      const ownedSet = new Set((owned ?? []).map((a) => a.id));
      if (existingIds.some((id) => !ownedSet.has(id)))
        return { ok: false, error: "One of the selected ads could not be found." };
    }

    type Row = { ad_id: string; date: string; spend: number; leads: number };
    const rowsToWrite: Row[] = [];
    let skipped = 0;

    // Normalize the "existing" rows, de-duped by (ad, day) — a single command
    // can't upsert the same conflict target twice.
    const incoming = new Map<string, Row>();
    for (const item of existingItems) {
      const date = String(item.date).slice(0, 10);
      const spend = Number(item.spend);
      const leads = Math.trunc(Number(item.leads));
      if (!date || !Number.isFinite(spend) || spend < 0) continue;
      const safeLeads = Number.isFinite(leads) && leads >= 0 ? leads : 0;
      incoming.set(conflictKey(item.adId, date), { ad_id: item.adId, date, spend, leads: safeLeads });
    }

    // Look up whatever already exists for those (ad, day) pairs.
    const current = new Map<string, { spend: number; leads: number }>();
    if (incoming.size > 0) {
      const dates = Array.from(new Set([...incoming.values()].map((r) => r.date)));
      const { data: metrics, error: mErr } = await supabase
        .from("ad_daily_metrics")
        .select("ad_id, date, spend, leads")
        .in("ad_id", existingIds)
        .in("date", dates);
      if (mErr) console.error("[importCsvMetrics] metrics lookup failed:", mErr);
      for (const m of metrics ?? [])
        current.set(conflictKey(m.ad_id, m.date), { spend: Number(m.spend), leads: Number(m.leads) });
    }

    // Classify each incoming "existing" row: new / identical / conflict.
    const conflicts: MetricConflict[] = [];
    for (const [key, row] of incoming) {
      const existing = current.get(key);
      if (!existing) {
        rowsToWrite.push(row); // no data yet — just insert
        continue;
      }
      if (existing.leads === row.leads && spendsEqual(existing.spend, row.spend)) {
        skipped++; // identical — nothing to do
        continue;
      }
      const choice = resolutions[key];
      if (choice === "csv") rowsToWrite.push(row);
      else if (choice === "keep") skipped++;
      else conflicts.push({ adId: row.ad_id, date: row.date, existing, incoming: { spend: row.spend, leads: row.leads } });
    }

    // Don't write anything (or create new ads) until conflicts are resolved.
    if (conflicts.length > 0)
      return { ok: false, error: "Some rows already have data for that day.", conflicts };

    // Now safe to create "new" ads — brand-new rows can't conflict.
    for (const item of items) {
      if (item.kind !== "new") continue;
      const date = String(item.date).slice(0, 10);
      const spend = Number(item.spend);
      const leads = Math.trunc(Number(item.leads));
      if (!date || !Number.isFinite(spend) || spend < 0) continue;
      const safeLeads = Number.isFinite(leads) && leads >= 0 ? leads : 0;
      const name = cleanText(item.name);
      if (!name) continue;
      const { data: ad, error } = await supabase
        .from("ads")
        .insert({ user_id: userId, name, client: null, start_date: date })
        .select("id")
        .single();
      if (error || !ad) {
        console.error("[importCsvMetrics] create ad failed:", error);
        return { ok: false, error: `Could not create the ad "${name}".` };
      }
      await supabase.from("ad_run_periods").insert({ ad_id: ad.id, start_date: date, end_date: null });
      rowsToWrite.push({ ad_id: ad.id, date, spend, leads: safeLeads });
    }

    if (rowsToWrite.length === 0) {
      if (skipped > 0) return { ok: true, count: 0, skipped }; // all rows were already up to date
      return { ok: false, error: "Nothing to import." };
    }

    const { error } = await supabase
      .from("ad_daily_metrics")
      .upsert(rowsToWrite, { onConflict: "ad_id,date" });
    if (error) {
      console.error("[importCsvMetrics] upsert failed:", error);
      return { ok: false, error: "Could not save the imported data." };
    }

    revalidatePath("/");
    for (const id of new Set(rowsToWrite.map((m) => m.ad_id))) revalidatePath(`/ads/${id}`);
    return { ok: true, count: rowsToWrite.length, skipped };
  } catch (e) {
    console.error("[importCsvMetrics] threw:", e);
    return { ok: false, error: "Something went wrong during import." };
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
