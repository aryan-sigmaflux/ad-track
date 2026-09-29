-- 0003_ad_board_column — which kanban column an ad sits in on the home board.
-- See database-design.md §4.2.

alter table public.ads
  add column if not exists board_column text not null default 'all';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ads_board_column_check'
  ) then
    alter table public.ads
      add constraint ads_board_column_check
      check (board_column in ('all', 'winning', 'losing'));
  end if;
end $$;
