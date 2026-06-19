import { createAdminClient } from "@/lib/supabase/admin";
import type { AdDetail, AdListItem, AdRunPeriod, AdStatus } from "@/lib/types";

/** All ads for a user, newest first, with derived running/stopped status. */
export async function getAds(userId: string): Promise<AdListItem[]> {
  const supabase = createAdminClient();

  const { data: ads, error } = await supabase
    .from("ads")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!ads || ads.length === 0) return [];

  // Which of these ads have an open (still-running) period?
  const { data: openPeriods } = await supabase
    .from("ad_run_periods")
    .select("ad_id")
    .is("end_date", null)
    .in(
      "ad_id",
      ads.map((a) => a.id),
    );

  const running = new Set((openPeriods ?? []).map((p) => p.ad_id));

  return ads.map((ad) => ({
    ...ad,
    status: (running.has(ad.id) ? "running" : "stopped") as AdStatus,
  }));
}

/** Full detail for one ad. Returns null if it doesn't exist or isn't owned by the user. */
export async function getAdDetail(adId: string, userId: string): Promise<AdDetail | null> {
  const supabase = createAdminClient();

  const { data: ad } = await supabase
    .from("ads")
    .select("*")
    .eq("id", adId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!ad) return null;

  const [{ data: periods }, { data: metrics }] = await Promise.all([
    supabase
      .from("ad_run_periods")
      .select("*")
      .eq("ad_id", adId)
      .order("start_date", { ascending: true }),
    supabase
      .from("ad_daily_metrics")
      .select("*")
      .eq("ad_id", adId)
      .order("date", { ascending: true }),
  ]);

  const periodList = (periods ?? []) as AdRunPeriod[];
  const status: AdStatus = periodList.some((p) => p.end_date === null)
    ? "running"
    : "stopped";

  // Most recent stop (only meaningful when currently stopped).
  let lastStopReason: string | null = null;
  let lastStopDate: string | null = null;
  if (status === "stopped") {
    const stopped = periodList
      .filter((p) => p.end_date !== null)
      .sort((a, b) => (a.end_date! < b.end_date! ? 1 : -1));
    if (stopped.length > 0) {
      lastStopReason = stopped[0].stop_reason;
      lastStopDate = stopped[0].end_date;
    }
  }

  return {
    ad,
    status,
    periods: periodList,
    metrics: (metrics ?? []).map((m) => ({
      ...m,
      spend: Number(m.spend),
      leads: Number(m.leads),
    })),
    lastStopReason,
    lastStopDate,
  };
}
