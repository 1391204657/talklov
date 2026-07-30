-- TalkLov subscriptions / Founder / Boost (keep verified ≠ plan)
-- Run in Supabase SQL Editor.

-- Paid plan is separate from trust tier (guest/light/verified).
alter table public.profiles
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'vip', 'founder'));

alter table public.profiles
  add column if not exists plan_expires_at timestamptz;

alter table public.profiles
  add column if not exists is_founder boolean not null default false;

alter table public.profiles
  add column if not exists founder_slot int
    check (founder_slot is null or (founder_slot >= 1 and founder_slot <= 200));

alter table public.profiles
  add column if not exists founder_granted_at timestamptz;

alter table public.profiles
  add column if not exists founder_last_active_at timestamptz;

alter table public.profiles
  add column if not exists boost_until timestamptz;

alter table public.profiles
  add column if not exists stripe_customer_id text;

create unique index if not exists profiles_founder_slot_uidx
  on public.profiles (founder_slot)
  where founder_slot is not null;

create index if not exists idx_profiles_plan
  on public.profiles (plan, plan_expires_at);

create index if not exists idx_profiles_boost_until
  on public.profiles (boost_until)
  where boost_until is not null;

-- Purchase / subscription audit log
create table if not exists public.subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  provider           text not null default 'stripe'
                     check (provider in ('stripe', 'apple', 'google', 'manual')),
  stripe_subscription_id text,
  stripe_price_id    text,
  status             text not null default 'active'
                     check (status in ('active', 'canceled', 'past_due', 'expired', 'trialing')),
  plan               text not null default 'vip'
                     check (plan in ('vip', 'founder')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  raw                jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_subscriptions_user
  on public.subscriptions (user_id, created_at desc);

create unique index if not exists subscriptions_stripe_sub_uidx
  on public.subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  for select using (auth.uid() = user_id);

-- One-off purchases (boost packs, AI cards)
create table if not exists public.purchases (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  provider        text not null default 'stripe',
  product         text not null, -- boost_30m | ai_cards_3 | ...
  stripe_session_id text,
  amount_cents    int,
  currency        text,
  status          text not null default 'paid'
                  check (status in ('paid', 'refunded', 'failed')),
  meta            jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_purchases_user
  on public.purchases (user_id, created_at desc);

alter table public.purchases enable row level security;

drop policy if exists purchases_select_own on public.purchases;
create policy purchases_select_own on public.purchases
  for select using (auth.uid() = user_id);

comment on column public.profiles.plan is
  'Paid entitlement: free | vip | founder. Independent of verified trust tier.';
comment on column public.profiles.is_founder is
  'Seed Founder (max 200). Lifetime VIP while active; may soft-freeze after long inactivity.';

-- Helper: grant next founder slot (run manually / from admin)
create or replace function public.grant_founder(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  next_slot int;
begin
  select coalesce(max(founder_slot), 0) + 1 into next_slot from public.profiles
   where founder_slot is not null;
  if next_slot > 200 then
    raise exception 'Founder slots full (200)';
  end if;
  update public.profiles
     set is_founder = true,
         founder_slot = next_slot,
         founder_granted_at = now(),
         founder_last_active_at = now(),
         plan = 'founder',
         plan_expires_at = null
   where id = p_user_id;
  return next_slot;
end;
$$;

revoke all on function public.grant_founder(uuid) from public;
-- Call via service role / SQL editor only.
