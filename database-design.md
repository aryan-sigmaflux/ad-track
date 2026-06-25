# Ad Tracker — Database Design

> Backend: **Supabase (PostgreSQL)** · Auth: **custom username + bcrypt** · Access: **server-only via service-role key**
> This document is the single source of truth for the schema. Update it whenever a table changes.

---

## 1. Key Decisions

| Decision | Choice | Notes |
|---|---|---|
| **Auth** | Custom `users` table | Login with a unique `username` ("id") + bcrypt-hashed password. No Supabase Auth. |
| **Session** | Signed httpOnly cookie | A JWT-style token signed with `AUTH_SESSION_SECRET`, storing `user_id`. |
| **Ad ownership** | Per user (private) | Each user only ever sees the ads they created. |
| **Run periods** | Multiple per ad | An ad can stop and restart → several rows in `ad_run_periods` → several bars on the calendar. |
| **CPL** | Derived, never stored | `CPL = spend / leads` (null when `leads = 0`). |
| **Ad status** | Derived, never stored | Running if any run period has `end_date IS NULL`, else stopped. |

---

## 2. Security Model (read this — it's the tricky part)

Because we use **custom auth** (not Supabase Auth), there is no `auth.uid()` JWT for RLS to key off.
So we protect data like this:

1. **RLS is enabled on every table, with _no_ policies.** This blocks the public/anon (`PUBLISHABLE`) key from reading or writing anything — even though that key is exposed in the browser.
2. **All database access happens in Next.js Server Actions / Route Handlers** (never directly from the browser), using the **`SUPABASE_SERVICE_ROLE_KEY`**, which bypasses RLS. The service-role key is **server-only** and must never be `NEXT_PUBLIC_*`.
3. **Ownership is enforced in application code**: every query filters by the `user_id` taken from the verified session cookie.

### Required environment variables (`.env.local`)
```bash
NEXT_PUBLIC_SUPABASE_URL=...              # already set
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...  # already set (anon; effectively unused for data while RLS blocks it)
SUPABASE_SERVICE_ROLE_KEY=...             # ADD THIS — server-only, never expose to client
AUTH_SESSION_SECRET=...                   # ADD THIS — long random string for signing the session cookie
```
> The stray `password=` line currently in `.env.local` looks like the Postgres DB password. The app does not use it at runtime; keep it out of the client bundle (it is not `NEXT_PUBLIC_`).

---

## 3. Entity Overview

```
users (1) ───< ads (1) ──┬──< ad_run_periods
                         └──< ad_daily_metrics
```

- A **user** has many **ads**.
- An **ad** has many **run periods** (each = one continuous bar; `end_date NULL` = still running).
- An **ad** has many **daily metrics** (one row per calendar day with data: spend + leads).

---

## 4. Tables

### 4.1 `users`
The login identity. `username` is the "id" the user types; uniqueness is **case-insensitive** (so `Sahil` and `sahil` collide → "already taken").

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `username` | `text` | not null, unique (case-insensitive) | The login "id"; stored as typed. |
| `password_hash` | `text` | not null | bcrypt hash (via `bcryptjs`). Never store plaintext. |
| `created_at` | `timestamptz` | not null, default `now()` | |

### 4.2 `ads`
One advertising campaign owned by a user. Drives the main list (`name`, `client`, `start_date`).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | not null, FK → `users.id` on delete cascade | Owner. |
| `name` | `text` | not null | Shown dark/bold in the list. |
| `client` | `text` | nullable | Client / company, shown lighter. |
| `start_date` | `date` | not null | The ad's original start date. |
| `created_at` | `timestamptz` | not null, default `now()` | |
| `updated_at` | `timestamptz` | not null, default `now()` | Auto-updated by trigger. |

### 4.3 `ad_run_periods`
Each row is one continuous interval the ad was running → one bar on the calendar. `end_date NULL` means it's still running today. When an ad is stopped, set `end_date` and `stop_reason`.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `ad_id` | `uuid` | not null, FK → `ads.id` on delete cascade | |
| `start_date` | `date` | not null | Bar start. |
| `end_date` | `date` | nullable | Bar end; `NULL` = ongoing. |
| `stop_reason` | `text` | nullable | Why it was stopped. Only set when `end_date` is set. |
| `created_at` | `timestamptz` | not null, default `now()` | |

**Constraints**
- `end_date IS NULL OR end_date >= start_date`
- `stop_reason IS NULL OR end_date IS NOT NULL` (can't have a reason with no stop date)

### 4.4 `ad_daily_metrics`
Per-day performance for an ad. A day with no data simply has no row (calendar shows "no data"). **CPL is not stored** — compute `spend / leads` (or null when `leads = 0`).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `ad_id` | `uuid` | not null, FK → `ads.id` on delete cascade | |
| `date` | `date` | not null | The metric day. |
| `spend` | `numeric(12,2)` | not null, default 0, `>= 0` | Money spent that day. |
| `leads` | `integer` | not null, default 0, `>= 0` | Leads generated that day. |
| `remarks` | `text` | nullable | Optional free-text notes for that day. |
| `created_at` | `timestamptz` | not null, default `now()` | |
| `updated_at` | `timestamptz` | not null, default `now()` | Auto-updated by trigger. |

**Constraints**
- `UNIQUE (ad_id, date)` — at most one metric row per ad per day (upsert on this).

---

## 5. Derived Values & Queries

### 5.1 Ad status & latest stop reason
```sql
-- status: 'running' if an open period exists, else 'stopped'
select case when exists (
         select 1 from ad_run_periods p
         where p.ad_id = :ad_id and p.end_date is null
       ) then 'running' else 'stopped' end as status;

-- most recent stop reason
select stop_reason
from ad_run_periods
where ad_id = :ad_id and end_date is not null
order by end_date desc
limit 1;
```

### 5.2 Calendar rendering
- **Run bar**: for each `ad_run_periods` row, fill every day from `start_date` to `COALESCE(end_date, current_date)`.
- **Current date**: hollow circle on `current_date`.
- **Future dates**: greyed out (any date `> current_date`).
- **Per-day details** (on tap): the matching `ad_daily_metrics` row → spend, leads, and computed CPL.

### 5.3 CPL (per day or aggregated)
```sql
-- per-day CPL: null when leads = 0
select date, spend, leads, (spend / nullif(leads, 0)) as cpl
from ad_daily_metrics
where ad_id = :ad_id and date between :start and :end
order by date;
```

### 5.4 "General data" range summary (the dropdown)
Aggregate over a date range. CPL uses **totals**, not an average of daily CPLs.
```sql
select
  coalesce(sum(spend), 0)                       as total_spend,
  coalesce(sum(leads), 0)                       as total_leads,
  (coalesce(sum(spend),0) / nullif(sum(leads),0)) as cpl
from ad_daily_metrics
where ad_id = :ad_id and date between :start and :end;
```

**Preset ranges** (computed in app code, `current_date` = today):
| Preset | Start | End |
|---|---|---|
| Last 7 days | today − 6 days | today |
| Last 30 days | today − 29 days | today |
| This week | most recent Monday | today |
| This month | first day of month | today |
| Custom | user-picked | user-picked |

> Week is assumed to start **Monday**. Change in one place if needed.

---

## 6. Full SQL Migration

Migrations live in `db/migrations/*.sql` and are applied with the runner script:

```bash
npm run db:migrate   # apply all pending migrations
npm run db:status    # list applied / pending
```

The runner (`scripts/migrate.mjs`) connects directly to Postgres using the project ref from
`NEXT_PUBLIC_SUPABASE_URL` + the `password` value in `.env.local`, records applied files in a
`schema_migrations` table, and runs each migration in a transaction. To add a schema change,
drop a new numbered file in `db/migrations/` (e.g. `0002_xxx.sql`) and run `npm run db:migrate`.

The full initial schema (`db/migrations/0001_init.sql`) is below — it can also be pasted into the
Supabase **SQL Editor** directly. Idempotent; safe to read top-to-bottom.

```sql
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
  remarks    text,
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

-- LOCK DOWN: enable RLS, create NO policies → anon/publishable key has zero access.
-- All access is via server actions using the service-role key.
alter table public.users           enable row level security;
alter table public.ads             enable row level security;
alter table public.ad_run_periods  enable row level security;
alter table public.ad_daily_metrics enable row level security;
```

---

## 7. TypeScript Types (reference)

```ts
export type User = {
  id: string;
  username: string;
  password_hash: string; // never sent to the client
  created_at: string;
};

export type Ad = {
  id: string;
  user_id: string;
  name: string;
  client: string | null;
  start_date: string;      // 'YYYY-MM-DD'
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
  date: string;
  spend: number;
  leads: number;
  created_at: string;
  updated_at: string;
};

// derived, not stored
export type AdStatus = "running" | "stopped";
```

---

## 8. Status / TODO

- [ ] Run the SQL migration in Supabase.
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` and `AUTH_SESSION_SECRET` to `.env.local`.
- [ ] **Page 1 — Login / Sign up** (in progress).
- [ ] Page 2 — Main page (ad list + add ad).
- [ ] Page 3 — Ad detail (calendar, per-day metrics, range summary, edit).
```
