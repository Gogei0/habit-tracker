-- FeelWrite / Habit Tracker Supabase sync setup
-- Run this once in Supabase Dashboard -> SQL Editor -> New query.
-- The app uses RPC functions, not direct table access.

create extension if not exists pgcrypto;

create table if not exists public.habit_sync_states (
  sync_code_hash text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.habit_sync_states enable row level security;

revoke all on table public.habit_sync_states from anon;
revoke all on table public.habit_sync_states from authenticated;

create or replace function public.load_habit_state(p_sync_code text)
returns table(data jsonb, updated_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if length(coalesce(trim(p_sync_code), '')) < 12 then
    raise exception 'sync_code_too_short';
  end if;

  return query
    select h.data, h.updated_at
    from public.habit_sync_states h
    where h.sync_code_hash = encode(digest(p_sync_code, 'sha256'), 'hex');
end;
$$;

create or replace function public.save_habit_state(
  p_sync_code text,
  p_data jsonb,
  p_previous_updated_at timestamptz default null
)
returns table(data jsonb, updated_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_existing_updated_at timestamptz;
  v_next_updated_at timestamptz := now();
begin
  if length(coalesce(trim(p_sync_code), '')) < 12 then
    raise exception 'sync_code_too_short';
  end if;

  v_hash := encode(digest(p_sync_code, 'sha256'), 'hex');

  select h.updated_at
    into v_existing_updated_at
    from public.habit_sync_states h
    where h.sync_code_hash = v_hash;

  if v_existing_updated_at is not null
     and p_previous_updated_at is not null
     and v_existing_updated_at > p_previous_updated_at then
    raise exception 'cloud_state_changed';
  end if;

  insert into public.habit_sync_states(sync_code_hash, data, updated_at)
  values (v_hash, p_data, v_next_updated_at)
  on conflict (sync_code_hash)
  do update set
    data = excluded.data,
    updated_at = excluded.updated_at;

  return query
    select h.data, h.updated_at
    from public.habit_sync_states h
    where h.sync_code_hash = v_hash;
end;
$$;

revoke all on function public.load_habit_state(text) from public;
revoke all on function public.save_habit_state(text, jsonb, timestamptz) from public;

grant execute on function public.load_habit_state(text) to anon;
grant execute on function public.save_habit_state(text, jsonb, timestamptz) to anon;
