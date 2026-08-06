-- User moments (动态) — sync across devices + admin review.
-- Run in Supabase SQL Editor.

create table if not exists public.moments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  body          text not null default '',
  tag           text,
  -- Remote URLs preferred; large data: URLs may be omitted client-side.
  media         jsonb not null default '[]'::jsonb,
  duo_invite_id text,
  likes_count   int not null default 0,
  comments      jsonb not null default '[]'::jsonb,
  corrections   jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint moments_body_len check (char_length(body) <= 4000)
);

create index if not exists idx_moments_user_created
  on public.moments (user_id, created_at desc);

create index if not exists idx_moments_created
  on public.moments (created_at desc);

alter table public.moments enable row level security;

drop policy if exists moments_select_all on public.moments;
create policy moments_select_all on public.moments
  for select using (true);

drop policy if exists moments_insert_own on public.moments;
create policy moments_insert_own on public.moments
  for insert with check (auth.uid() = user_id);

drop policy if exists moments_update_own on public.moments;
create policy moments_update_own on public.moments
  for update using (auth.uid() = user_id);

drop policy if exists moments_delete_own on public.moments;
create policy moments_delete_own on public.moments
  for delete using (auth.uid() = user_id);

grant select on table public.moments to anon, authenticated;
grant insert, update, delete on table public.moments to authenticated;

comment on table public.moments is
  'User-published Moments. Readable by all; write own row only. Service role for admin.';
