-- Favorites / save for later (+ "who favorited me" for VIP)
-- Run in Supabase SQL Editor.

create table if not exists public.favorites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  target_id   uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint favorites_no_self check (user_id <> target_id)
);

create unique index if not exists favorites_user_target_uidx
  on public.favorites (user_id, target_id);

create index if not exists idx_favorites_user
  on public.favorites (user_id, created_at desc);

create index if not exists idx_favorites_target
  on public.favorites (target_id, created_at desc);

alter table public.favorites enable row level security;

-- Own favorites: full CRUD
drop policy if exists favorites_select_own on public.favorites;
create policy favorites_select_own on public.favorites
  for select using (auth.uid() = user_id);

drop policy if exists favorites_insert_own on public.favorites;
create policy favorites_insert_own on public.favorites
  for insert with check (auth.uid() = user_id and auth.uid() <> target_id);

drop policy if exists favorites_delete_own on public.favorites;
create policy favorites_delete_own on public.favorites
  for delete using (auth.uid() = user_id);

-- Targets can see who favorited them (app still gates VIP in UI)
drop policy if exists favorites_select_as_target on public.favorites;
create policy favorites_select_as_target on public.favorites
  for select using (auth.uid() = target_id);

comment on table public.favorites is
  'User saved profiles for later. Free: own list. VIP: who favorited me.';
