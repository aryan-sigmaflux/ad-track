// DB row shapes — see database-design.md §7.

export type Ad = {
  id: string;
  user_id: string;
  name: string;
  client: string | null;
  start_date: string; // 'YYYY-MM-DD'
  created_at: string;
  updated_at: string;
};

export type AdRunPeriod = {
  id: string;
  ad_id: string;
  start_date: string;
  end_date: string | null; // null = still running
  stop_reason: string | null;
  created_at: string;
};

export type AdDailyMetric = {
  id: string;
  ad_id: string;
  date: string; // 'YYYY-MM-DD'
  spend: number;
  leads: number;
  created_at: string;
  updated_at: string;
};

export type AdStatus = "running" | "stopped";

/** An ad plus derived status for the list view. */
export type AdListItem = Ad & { status: AdStatus };

/** One ad as summarised on a client (category) page. */
export type ClientAdSummary = {
  id: string;
  name: string;
  status: AdStatus;
  spend: number; // all-time
  leads: number; // all-time
};

/** A single day's totals across a client's ads. */
export type DailyPoint = { date: string; spend: number; leads: number };

/** Everything the client (category) page needs. `client` is null for "Others". */
export type ClientDetail = {
  client: string | null;
  label: string;
  ads: ClientAdSummary[];
  daily: DailyPoint[]; // sorted ascending, only days with data
};

/** Everything the ad detail page needs. */
export type AdDetail = {
  ad: Ad;
  status: AdStatus;
  periods: AdRunPeriod[];
  metrics: AdDailyMetric[];
  /** Most recent stop reason, if currently stopped. */
  lastStopReason: string | null;
  lastStopDate: string | null;
};
