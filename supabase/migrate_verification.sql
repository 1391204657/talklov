-- Real-person verification: lock verified/tier + review queue.
-- Run in Supabase SQL Editor after migrate_photo_privacy_gate.sql.

-- 1) Users must not self-grant trust tier
revoke update (verified) on table public.profiles from authenticated;
revoke update (tier) on table public.profiles from authenticated;
revoke insert (verified) on table public.profiles from authenticated;
revoke insert (tier) on table public.profiles from authenticated;

comment on column public.profiles.verified is
  'Trust badge. Writable only by service role / admin after verification review.';
comment on column public.profiles.tier is
  'light | verified. Writable only by service role / admin.';

-- 2) Verification submissions (selfie kept private; no public SELECT policies)
create table if not exists public.verification_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  -- Compressed JPEG/PNG data URL (MVP). Move to private Storage later if volume grows.
  selfie_data  text not null,
  status       text not null default 'pending'
               check (status in ('pending', 'approved', 'rejected')),
  admin_note   text,
  reviewed_by  uuid references auth.users (id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint verification_selfie_size check (char_length(selfie_data) <= 700000)
);

create index if not exists idx_verification_requests_status
  on public.verification_requests (status, created_at desc);

create index if not exists idx_verification_requests_user
  on public.verification_requests (user_id, created_at desc);

-- At most one pending request per user
create unique index if not exists verification_requests_one_pending
  on public.verification_requests (user_id)
  where status = 'pending';

alter table public.verification_requests enable row level security;
-- Intentionally no policies for anon/authenticated: access only via service role APIs.

comment on table public.verification_requests is
  'Selfie verification queue. Approve sets profiles.verified + tier=verified.';
