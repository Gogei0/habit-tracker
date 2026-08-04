-- FeelWrite YouTube extension upgrade
-- Run once in Supabase Dashboard -> SQL Editor -> New query.

create extension if not exists pgcrypto;

create or replace function public.load_youtube_unlocks(p_sync_code text)
returns table(unlocks jsonb, updated_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if length(coalesce(trim(p_sync_code), '')) < 12 then
    raise exception 'sync_code_too_short';
  end if;

  return query
    select
      case
        when jsonb_typeof(h.data->'youtubeUnlocks') = 'array' then h.data->'youtubeUnlocks'
        else '[]'::jsonb
      end,
      h.updated_at
    from public.habit_sync_states h
    where h.sync_code_hash = encode(digest(p_sync_code, 'sha256'), 'hex');
end;
$$;

revoke all on function public.load_youtube_unlocks(text) from public;
grant execute on function public.load_youtube_unlocks(text) to anon;
