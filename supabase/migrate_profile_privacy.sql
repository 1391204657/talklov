-- Step 1: Harden profiles — hide phone / Stripe from anon & authenticated clients.
-- Admin / service_role still sees everything (bypasses RLS + has full grants).
-- Run in Supabase SQL Editor.

-- 1) Column privileges: clients cannot SELECT sensitive columns
revoke select (phone_e164) on table public.profiles from anon, authenticated;
revoke select (stripe_customer_id) on table public.profiles from anon, authenticated;

-- Ensure table-level select still exists for other columns (Supabase default).
-- If a full-table SELECT grant exists, column REVOKE above is enough in PG.
-- Re-assert safe SELECT so discover keeps working if grants were wiped:
grant select on table public.profiles to anon, authenticated;
revoke select (phone_e164) on table public.profiles from anon, authenticated;
revoke select (stripe_customer_id) on table public.profiles from anon, authenticated;

-- 2) Own secrets (phone + stripe id) for the logged-in user only
create or replace function public.my_profile_secrets()
returns table (phone_e164 text, stripe_customer_id text)
language sql
security definer
set search_path = public
stable
as $$
  select p.phone_e164, p.stripe_customer_id
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke all on function public.my_profile_secrets() from public;
grant execute on function public.my_profile_secrets() to authenticated;

-- 3) Phone uniqueness check without leaking owner
create or replace function public.is_phone_taken(p_phone text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.phone_e164 = p_phone
      and p.id is distinct from auth.uid()
  );
$$;

revoke all on function public.is_phone_taken(text) from public;
grant execute on function public.is_phone_taken(text) to anon, authenticated;

-- 4) Lightweight admin audit log (who viewed PII / took actions)
create table if not exists public.admin_audit_log (
  id              uuid primary key default gen_random_uuid(),
  admin_user_id   uuid,
  admin_email     text,
  action          text not null,
  target_user_id  uuid,
  meta            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_admin_audit_created
  on public.admin_audit_log (created_at desc);

create index if not exists idx_admin_audit_target
  on public.admin_audit_log (target_user_id, created_at desc);

alter table public.admin_audit_log enable row level security;
-- No policies for anon/authenticated — service role only.

comment on table public.admin_audit_log is
  'Admin console actions (view phone, grant VIP, etc). Service role writes only.';
