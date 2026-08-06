-- Mach Ma!: sicherer gemeinsamer Familienspeicher ohne Benutzerkonto
-- Dieses Skript vollständig im Supabase SQL Editor ausführen.

create extension if not exists pgcrypto;

create table if not exists public.familienbrett_boards (
  board_key text primary key,
  pin_hash text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.familienbrett_sessions (
  token_hash text primary key,
  board_key text not null references public.familienbrett_boards(board_key) on delete cascade,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '180 days')
);

alter table public.familienbrett_boards enable row level security;
alter table public.familienbrett_sessions enable row level security;
revoke all on table public.familienbrett_boards, public.familienbrett_sessions from anon, authenticated;

create or replace function public.login_familienbrett(p_board_code text, p_pin text)
returns table(access_token text)
language plpgsql security definer set search_path = public
as $$
declare
  v_board_key text := encode(digest(upper(trim(coalesce(p_board_code, ''))), 'sha256'), 'hex');
  v_pin_hash text;
  v_token text;
begin
  select b.pin_hash into v_pin_hash from public.familienbrett_boards b where b.board_key = v_board_key;
  if v_pin_hash is null or crypt(coalesce(p_pin, ''), v_pin_hash) <> v_pin_hash then
    raise exception 'invalid_family_access';
  end if;
  v_token := gen_random_uuid()::text || gen_random_uuid()::text;
  insert into public.familienbrett_sessions(token_hash, board_key)
  values (encode(digest(v_token, 'sha256'), 'hex'), v_board_key);
  return query select v_token;
end;
$$;

create or replace function public.load_familienbrett_state(p_access_token text)
returns table(data jsonb, updated_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare v_token_hash text := encode(digest(coalesce(p_access_token, ''), 'sha256'), 'hex');
begin
  update public.familienbrett_sessions set last_used_at = now()
    where token_hash = v_token_hash and expires_at > now();
  if not found then raise exception 'invalid_or_expired_session'; end if;
  return query select b.data, b.updated_at
    from public.familienbrett_boards b join public.familienbrett_sessions s on s.board_key = b.board_key
    where s.token_hash = v_token_hash;
end;
$$;

create or replace function public.save_familienbrett_state(
  p_access_token text, p_data jsonb, p_previous_updated_at timestamptz default null
)
returns table(updated_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare
  v_token_hash text := encode(digest(coalesce(p_access_token, ''), 'sha256'), 'hex');
  v_board_key text;
  v_current_updated_at timestamptz;
  v_new_updated_at timestamptz;
begin
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'invalid_board_data'; end if;
  select s.board_key into v_board_key from public.familienbrett_sessions s
    where s.token_hash = v_token_hash and s.expires_at > now();
  if v_board_key is null then raise exception 'invalid_or_expired_session'; end if;
  select b.updated_at into v_current_updated_at from public.familienbrett_boards b
    where b.board_key = v_board_key for update;
  if p_previous_updated_at is not null and v_current_updated_at <> p_previous_updated_at then
    raise exception 'cloud_state_changed';
  end if;
  v_new_updated_at := clock_timestamp();
  update public.familienbrett_boards set data = p_data, updated_at = v_new_updated_at where board_key = v_board_key;
  update public.familienbrett_sessions set last_used_at = now() where token_hash = v_token_hash;
  return query select v_new_updated_at;
end;
$$;

revoke all on function public.login_familienbrett(text, text) from public;
revoke all on function public.load_familienbrett_state(text) from public;
revoke all on function public.save_familienbrett_state(text, jsonb, timestamptz) from public;
grant execute on function public.login_familienbrett(text, text) to anon, authenticated;
grant execute on function public.load_familienbrett_state(text) to anon, authenticated;
grant execute on function public.save_familienbrett_state(text, jsonb, timestamptz) to anon, authenticated;

-- Genau eine Testfamilie anlegen. Familiencode: MACHMA-SOMMER-7K4P, PIN: 68429153
insert into public.familienbrett_boards(board_key, pin_hash, data)
values (
  encode(digest('MACHMA-SOMMER-7K4P', 'sha256'), 'hex'),
  crypt('68429153', gen_salt('bf', 10)),
  '{}'::jsonb
)
on conflict (board_key) do update set pin_hash = excluded.pin_hash;
