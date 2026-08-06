-- Stronger column allow-list for profiles.
-- Fixes: GRANT SELECT ON TABLE re-opens phone_e164 / stripe_customer_id.
-- Run in Supabase SQL Editor (paste below previous scripts is fine).

-- 0) Ensure secrets RPCs exist (and fix any prior typo)
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

-- 1) Wipe broad table grants for API roles
revoke all on table public.profiles from anon, authenticated;

-- 2) SELECT allow-list only (NO phone_e164, stripe_customer_id, ban_reason, banned_by, banned_at)
grant select (
  id,
  handle,
  name,
  age,
  gender,
  country,
  city,
  native_lang,
  learning_lang,
  level,
  intents,
  interests,
  bio,
  avatar_url,
  photos,
  occupation,
  education,
  zodiac,
  chinese_variant,
  photo_privacy,
  tier,
  verified,
  online,
  plan,
  plan_expires_at,
  is_founder,
  founder_slot,
  founder_granted_at,
  founder_last_active_at,
  boost_until,
  referred_by_code,
  created_at,
  updated_at
) on table public.profiles to anon, authenticated;

-- 3) INSERT for new auth users / profile bootstrap (RLS: insert own)
grant insert (
  id,
  handle,
  name,
  age,
  gender,
  country,
  city,
  native_lang,
  learning_lang,
  level,
  intents,
  interests,
  bio,
  avatar_url,
  photos,
  occupation,
  education,
  zodiac,
  chinese_variant,
  photo_privacy,
  tier,
  verified,
  online,
  phone_e164,
  referred_by_code,
  created_at,
  updated_at
) on table public.profiles to authenticated;

-- 4) UPDATE allow-list (can write own phone; cannot write stripe / ban / plan)
grant update (
  handle,
  name,
  age,
  gender,
  country,
  city,
  native_lang,
  learning_lang,
  level,
  intents,
  interests,
  bio,
  avatar_url,
  photos,
  occupation,
  education,
  zodiac,
  chinese_variant,
  photo_privacy,
  tier,
  verified,
  online,
  phone_e164,
  referred_by_code,
  founder_last_active_at,
  updated_at
) on table public.profiles to authenticated;

-- 5) Belt-and-suspenders: deny sensitive SELECT even if something re-granted table SELECT later
revoke select (phone_e164) on table public.profiles from anon, authenticated;
revoke select (stripe_customer_id) on table public.profiles from anon, authenticated;
revoke select (ban_reason) on table public.profiles from anon, authenticated;
revoke select (banned_by) on table public.profiles from anon, authenticated;
revoke select (banned_at) on table public.profiles from anon, authenticated;

comment on column public.profiles.phone_e164 is
  'E.164 phone. Not selectable by anon/authenticated; use my_profile_secrets().';
comment on column public.profiles.stripe_customer_id is
  'Stripe customer id. Service role / my_profile_secrets only.';
