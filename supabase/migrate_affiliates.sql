-- TalkLov affiliate / KOL commissions (independent of Founder seats)
-- Run in Supabase SQL Editor after migrate_subscriptions.sql

-- Sticky referral on the buyer (first-touch wins)
alter table public.profiles
  add column if not exists referred_by_code text;

create index if not exists idx_profiles_referred_by_code
  on public.profiles (referred_by_code)
  where referred_by_code is not null;

-- Affiliates (KOL / creators)
create table if not exists public.affiliates (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,
  display_name       text not null,
  user_id            uuid references public.profiles (id) on delete set null,
  contact_email      text,
  -- Commission rates as basis points (2000 = 20.00%)
  first_bps          int not null default 2000
                     check (first_bps >= 0 and first_bps <= 10000),
  renew_bps          int not null default 1000
                     check (renew_bps >= 0 and renew_bps <= 10000),
  active             boolean not null default true,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint affiliates_code_format check (code ~ '^[a-z0-9_-]{2,32}$')
);

create index if not exists idx_affiliates_active
  on public.affiliates (active)
  where active;

alter table public.affiliates enable row level security;
-- No public policies: service role / SQL Editor only.

-- Commission ledger
create table if not exists public.affiliate_commissions (
  id                   uuid primary key default gen_random_uuid(),
  affiliate_id         uuid not null references public.affiliates (id) on delete cascade,
  buyer_user_id        uuid not null references public.profiles (id) on delete cascade,
  kind                 text not null
                       check (kind in ('first', 'renew')),
  product              text not null,
  stripe_session_id    text,
  stripe_invoice_id    text,
  stripe_payment_intent text,
  amount_cents         int not null check (amount_cents >= 0),
  currency             text not null default 'usd',
  commission_cents     int not null check (commission_cents >= 0),
  rate_bps             int not null,
  status               text not null default 'pending'
                       check (status in ('pending', 'payable', 'paid', 'void')),
  paid_at              timestamptz,
  meta                 jsonb,
  created_at           timestamptz not null default now()
);

-- Dedup: one commission per Stripe session / invoice
create unique index if not exists affiliate_commissions_session_uidx
  on public.affiliate_commissions (stripe_session_id)
  where stripe_session_id is not null;

create unique index if not exists affiliate_commissions_invoice_uidx
  on public.affiliate_commissions (stripe_invoice_id)
  where stripe_invoice_id is not null;

create index if not exists idx_affiliate_commissions_affiliate
  on public.affiliate_commissions (affiliate_id, status, created_at desc);

create index if not exists idx_affiliate_commissions_status
  on public.affiliate_commissions (status, created_at desc);

alter table public.affiliate_commissions enable row level security;
-- No public policies: service role / SQL Editor only.

comment on table public.affiliates is
  'KOL / creator affiliate codes. Founder seats are unrelated.';
comment on table public.affiliate_commissions is
  'Commission ledger. pending → payable (monthly) → paid. void on refund.';
comment on column public.profiles.referred_by_code is
  'First-touch affiliate code (sticky). Set once from ?ref= cookie.';

-- Helper: create or update an affiliate (SQL Editor / service role)
create or replace function public.upsert_affiliate(
  p_code text,
  p_display_name text,
  p_contact_email text default null,
  p_user_id uuid default null,
  p_first_bps int default 2000,
  p_renew_bps int default 1000,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_code text := lower(trim(p_code));
begin
  if v_code is null or v_code !~ '^[a-z0-9_-]{2,32}$' then
    raise exception 'Invalid affiliate code';
  end if;

  insert into public.affiliates (
    code, display_name, contact_email, user_id, first_bps, renew_bps, notes
  ) values (
    v_code, p_display_name, p_contact_email, p_user_id, p_first_bps, p_renew_bps, p_notes
  )
  on conflict (code) do update
    set display_name = excluded.display_name,
        contact_email = coalesce(excluded.contact_email, affiliates.contact_email),
        user_id = coalesce(excluded.user_id, affiliates.user_id),
        first_bps = excluded.first_bps,
        renew_bps = excluded.renew_bps,
        notes = coalesce(excluded.notes, affiliates.notes),
        updated_at = now(),
        active = true
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.upsert_affiliate(text, text, text, uuid, int, int, text) from public;
