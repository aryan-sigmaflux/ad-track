-- 0002_metric_remarks — optional free-text remarks on a day's metrics.
-- See database-design.md §4.4.

alter table public.ad_daily_metrics
  add column if not exists remarks text;
