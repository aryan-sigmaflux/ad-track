-- 0004_ad_board_position — manual card order within a kanban column.
-- See database-design.md §4.2. NULL = never placed by hand; those sort first
-- (newest first), so freshly added ads show up at the top of their column.

alter table public.ads
  add column if not exists board_position integer;

-- Put `p_ids` into `p_column` in exactly that order (1-based positions).
-- Only touches ads owned by `p_user`; the app also verifies ownership first.
create or replace function public.reorder_board_column(
  p_user uuid,
  p_column text,
  p_ids uuid[]
) returns void
language sql
as $$
  update public.ads
     set board_column = p_column,
         board_position = array_position(p_ids, id)
   where user_id = p_user
     and id = any(p_ids);
$$;

-- Server-only (service role); never callable with the public keys.
revoke execute on function public.reorder_board_column(uuid, text, uuid[]) from public, anon, authenticated;
grant execute on function public.reorder_board_column(uuid, text, uuid[]) to service_role;
