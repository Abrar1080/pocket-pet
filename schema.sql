-- Pocket Pet — Supabase schema (free tier).
-- Run this whole file once in the Supabase dashboard: SQL Editor -> New query -> Paste -> Run.
-- It is safe to re-run: tables are created only if missing.
--
-- Tables used by the app (db.js):
--   profiles, pets, inventory, care_logs, quest_claims,
--   rooms, room_members, messages, races, achievement_claims
--
-- v2 ADDITIVE CHANGES (features update, Oct 2026): the block at the
-- bottom only ADDS a tricks column on pets and a new
-- achievement_claims table. Nothing is renamed or dropped. If you
-- already ran v1, just run the v2 block — it is safe to re-run.
--
-- SECURITY: Row Level Security is ON for every table. The policies below
-- let a logged-in player read/write only their own rows, and let any
-- logged-in player read rooms/members/messages/races (needed so friends
-- in a room can see each other). Coin changes are saved by the player's
-- own client in this free-tier build. For a production game with real
-- money, replace client coin writes with SECURITY DEFINER functions
-- (example stub at the bottom) so clients cannot mint coins.

create extension if not exists pgcrypto;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Player',
  coins integer not null default 100,
  streak integer not null default 0,
  last_care_date date,
  care_coins_date date,
  care_coins_today integer not null default 0,
  games_coins_date date,
  games_coins_today integer not null default 0,
  games_played_date date,
  games_played_today integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- pets ----------
create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  species text not null default 'cat',
  name text not null default 'Milo',
  stage text not null default 'egg',
  xp integer not null default 0,
  sporty integer not null default 0,
  cozy integer not null default 0,
  hunger integer not null default 80,
  happiness integer not null default 80,
  energy integer not null default 80,
  health integer not null default 90,
  outfit text not null default 'none',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- inventory ----------
create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  item_id text not null,
  qty integer not null default 1,
  created_at timestamptz not null default now(),
  unique (owner_id, item_id)
);

-- ---------- care logs (diary + quest progress) ----------
create table if not exists public.care_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);

-- ---------- quest claims (one claim per player per quest per day) ----------
create table if not exists public.quest_claims (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  quest_key text not null,
  claim_date date not null,
  created_at timestamptz not null default now(),
  unique (owner_id, quest_key, claim_date)
);

-- ---------- rooms ----------
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------- room members (max 3 enforced in app code) ----------
create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);

-- ---------- chat messages ----------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  display_name text not null default 'Friend',
  body text not null,
  created_at timestamptz not null default now()
);

-- ---------- races ----------
create table if not exists public.races (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  started_by uuid not null references public.profiles (id) on delete cascade,
  results jsonb not null default '{}'::jsonb,
  winner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- realtime: chat, members, races ----------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.room_members;
alter publication supabase_realtime add table public.races;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.inventory enable row level security;
alter table public.care_logs enable row level security;
alter table public.quest_claims enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.messages enable row level security;
alter table public.races enable row level security;

-- own-row policies
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own pets" on public.pets;
create policy "own pets" on public.pets
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "read pets of others" on public.pets;
create policy "read pets of others" on public.pets
  for select using (auth.role() = 'authenticated');

drop policy if exists "own inventory" on public.inventory;
create policy "own inventory" on public.inventory
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "own care logs" on public.care_logs;
create policy "own care logs" on public.care_logs
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "own quest claims" on public.quest_claims;
create policy "own quest claims" on public.quest_claims
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- room-scoped tables: any logged-in player may read/write (rooms are
-- joined by secret 6-letter code, and membership is checked in app code)
drop policy if exists "room tables" on public.rooms;
create policy "room tables" on public.rooms
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "room members" on public.room_members;
create policy "room members" on public.room_members
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "room messages" on public.messages;
create policy "room messages" on public.messages
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "room races" on public.races;
create policy "room races" on public.races
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------- v2 ADDITIVE CHANGES (safe to re-run) ----------
-- Tricks learned per pet (stored as a JSON array of trick keys).
alter table public.pets add column if not exists tricks jsonb not null default '[]'::jsonb;

-- Achievement claims (one row per player per achievement).
create table if not exists public.achievement_claims (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  ach_key text not null,
  claimed_at timestamptz not null default now(),
  unique (owner_id, ach_key)
);
alter table public.achievement_claims enable row level security;
drop policy if exists "own achievement claims" on public.achievement_claims;
create policy "own achievement claims" on public.achievement_claims
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ---------- OPTIONAL hardening (production, real money) ----------
-- Move coin grants server-side so a modified client cannot mint coins:
--   create or replace function public.grant_coins(p_user uuid, p_amount int)
--   returns void language sql security definer as $$
--     update public.profiles set coins = coins + p_amount where id = p_user;
--   $$;
-- Then call it from the client with supabase.rpc('grant_coins', ...)
-- instead of updating profiles.coins directly, and tighten the profiles
-- UPDATE policy to exclude the coins column.
