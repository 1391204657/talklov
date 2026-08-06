-- Profile views ("谁看了我") — VIP list; free can see count teaser in app.
-- Run in Supabase SQL Editor.

create table if not exists public.profile_views (
  id            uuid primary key default gen_random_uuid(),
  viewer_id     uuid not null references public.profiles (id) on delete cascade,
  target_id     uuid not null references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  constraint profile_views_no_self check (viewer_id <> target_id)
);

create unique index if not exists profile_views_viewer_target_uidx
  on public.profile_views (viewer_id, target_id);

create index if not exists idx_profile_views_target
  on public.profile_views (target_id, last_viewed_at desc);

alter table public.profile_views enable row level security;

-- Viewer records their own visits
drop policy if exists profile_views_insert_own on public.profile_views;
create policy profile_views_insert_own on public.profile_views
  for insert with check (auth.uid() = viewer_id and auth.uid() <> target_id);

drop policy if exists profile_views_update_own on public.profile_views;
create policy profile_views_update_own on public.profile_views
  for update using (auth.uid() = viewer_id)
  with check (auth.uid() = viewer_id);

-- Target can read who viewed them (VIP gated in app UI)
drop policy if exists profile_views_select_as_target on public.profile_views;
create policy profile_views_select_as_target on public.profile_views
  for select using (auth.uid() = target_id);

-- Viewer can read their own rows (optional; useful for debugging / history)
drop policy if exists profile_views_select_own on public.profile_views;
create policy profile_views_select_own on public.profile_views
  for select using (auth.uid() = viewer_id);

comment on table public.profile_views is
  'Who viewed whose profile. Free: count teaser. VIP: full list.';
