-- Soft ban + user reports (admin moderation)
-- Run in Supabase SQL Editor.

alter table public.profiles
  add column if not exists banned_at timestamptz;

alter table public.profiles
  add column if not exists ban_reason text;

alter table public.profiles
  add column if not exists banned_by uuid references public.profiles (id) on delete set null;

create index if not exists idx_profiles_banned_at
  on public.profiles (banned_at)
  where banned_at is not null;

comment on column public.profiles.banned_at is
  'Soft ban: non-null means account restricted. User may still log in to see notice.';

-- Hide banned users from Discover (self can still read own row)
drop policy if exists profiles_select_all on public.profiles;
drop policy if exists profiles_select_visible on public.profiles;
create policy profiles_select_visible on public.profiles
  for select using (
    banned_at is null
    or auth.uid() = id
  );

-- Reports / tickets
create table if not exists public.reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid not null references public.profiles (id) on delete cascade,
  target_id        uuid not null references public.profiles (id) on delete cascade,
  conversation_id  uuid references public.conversations (id) on delete set null,
  reason           text not null default 'other'
                   check (reason in (
                     'spam', 'harassment', 'scam', 'sexual', 'underage', 'fake', 'other'
                   )),
  details          text,
  status           text not null default 'open'
                   check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  admin_note       text,
  resolved_by      uuid references public.profiles (id) on delete set null,
  resolved_at      timestamptz,
  created_at       timestamptz not null default now(),
  constraint reports_no_self check (reporter_id <> target_id)
);

create index if not exists idx_reports_status_created
  on public.reports (status, created_at desc);

create index if not exists idx_reports_target
  on public.reports (target_id, created_at desc);

create index if not exists idx_reports_reporter
  on public.reports (reporter_id, created_at desc);

alter table public.reports enable row level security;

drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports
  for insert with check (
    auth.uid() = reporter_id
    and auth.uid() <> target_id
  );

drop policy if exists reports_select_own on public.reports;
create policy reports_select_own on public.reports
  for select using (auth.uid() = reporter_id);

-- Helper: am I banned? (for clients after privacy column rules)
create or replace function public.am_i_banned()
returns table (banned boolean, ban_reason text, banned_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select
    (p.banned_at is not null) as banned,
    p.ban_reason,
    p.banned_at
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke all on function public.am_i_banned() from public;
grant execute on function public.am_i_banned() to authenticated;

comment on table public.reports is
  'User-submitted reports. Status updates via service role / admin API.';
