-- 0001_init — users, ads, ad_run_periods, ad_daily_metrics + RLS lockdown.
-- See database-design.md for the full design.

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- USERS
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  username      text not null,
  password_hash text not null,
  created_at    timestamptz not null default now()
);
create unique index if not exists users_username_lower_idx
  on public.users (lower(username));

-- ADS
create table if not exists public.ads (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  name       text not null,
  client     text,
  start_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ads_user_id_idx on public.ads (user_id);
drop trigger if exists ads_set_updated_at on public.ads;
create trigger ads_set_updated_at before update on public.ads
  for each row execute function public.set_updated_at();

-- AD RUN PERIODS
create table if not exists public.ad_run_periods (
  id          uuid primary key default gen_random_uuid(),
  ad_id       uuid not null references public.ads(id) on delete cascade,
  start_date  date not null,
  end_date    date,
  stop_reason text,
  created_at  timestamptz not null default now(),
  constraint run_period_valid_range  check (end_date is null or end_date >= start_date),
  constraint stop_reason_requires_end check (stop_reason is null or end_date is not null)
);
create index if not exists ad_run_periods_ad_id_idx on public.ad_run_periods (ad_id);

-- AD DAILY METRICS
create table if not exists public.ad_daily_metrics (
  id         uuid primary key default gen_random_uuid(),
  ad_id      uuid not null references public.ads(id) on delete cascade,
  date       date not null,
  spend      numeric(12,2) not null default 0,
  leads      integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spend_non_negative check (spend >= 0),
  constraint leads_non_negative check (leads >= 0),
  unique (ad_id, date)
);
create index if not exists ad_daily_metrics_ad_date_idx on public.ad_daily_metrics (ad_id, date);
drop trigger if exists ad_daily_metrics_set_updated_at on public.ad_daily_metrics;
create trigger ad_daily_metrics_set_updated_at before update on public.ad_daily_metrics
  for each row execute function public.set_updated_at();

-- LOCK DOWN: enable RLS, create NO policies → the public/anon key has zero access.
alter table public.users            enable row level security;
alter table public.ads              enable row level security;
alter table public.ad_run_periods   enable row level security;
alter table public.ad_daily_metrics enable row level security;
