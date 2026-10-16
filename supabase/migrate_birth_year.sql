-- Store birth year so displayed age increases each calendar year.
-- Users still enter current age at signup; we never ask for a birthday.

alter table public.profiles
  add column if not exists birth_year int
  check (birth_year is null or (birth_year >= 1900 and birth_year <= 2100));

comment on column public.profiles.birth_year is
  'Calendar birth year derived at signup from age. Display age = current_year - birth_year.';

-- Backfill once from the age snapshot users already have.
update public.profiles
set birth_year = extract(year from current_date)::int - age
where birth_year is null
  and age is not null
  and age between 18 and 120;

-- Keep the age column roughly current for any raw selects / filters.
update public.profiles
set age = extract(year from current_date)::int - birth_year
where birth_year is not null;

-- Column grants (match migrate_profile_privacy_harden allow-lists)
grant select (birth_year) on table public.profiles to anon, authenticated;
grant insert (birth_year) on table public.profiles to authenticated;
grant update (birth_year) on table public.profiles to authenticated;

-- Public profile RPCs: compute age from birth_year so it ticks without re-saving.
-- Must drop first: RETURNS TABLE shape changes when birth_year is added.
drop function if exists public.get_profile_public(uuid);
drop function if exists public.list_profiles_public();
drop function if exists public.get_profiles_public(uuid[]);

create or replace function public.get_profiles_public(p_ids uuid[] default null)
returns table (
  id uuid,
  handle text,
  name text,
  age int,
  gender text,
  country text,
  city text,
  native_lang text,
  learning_lang text,
  level text,
  intents text[],
  interests text[],
  bio text,
  avatar_url text,
  photos text[],
  photos_locked boolean,
  occupation text,
  education text,
  zodiac text,
  chinese_variant text,
  photo_privacy text,
  tier text,
  verified boolean,
  online boolean,
  plan text,
  plan_expires_at timestamptz,
  is_founder boolean,
  founder_slot int,
  founder_last_active_at timestamptz,
  boost_until timestamptz,
  referred_by_code text,
  created_at timestamptz,
  updated_at timestamptz,
  birth_year int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.handle,
    p.name,
    case
      when p.birth_year is not null
        then extract(year from current_date)::int - p.birth_year
      else p.age
    end as age,
    p.gender,
    p.country,
    p.city,
    p.native_lang,
    p.learning_lang,
    p.level,
    p.intents,
    p.interests,
    p.bio,
    case
      when public.viewer_may_see_photos(p.id, p.photo_privacy) then p.avatar_url
      else null
    end as avatar_url,
    case
      when public.viewer_may_see_photos(p.id, p.photo_privacy) then p.photos
      else null
    end as photos,
    (not public.viewer_may_see_photos(p.id, p.photo_privacy)) as photos_locked,
    p.occupation,
    p.education,
    p.zodiac,
    p.chinese_variant,
    p.photo_privacy,
    p.tier,
    p.verified,
    p.online,
    p.plan,
    p.plan_expires_at,
    p.is_founder,
    p.founder_slot,
    p.founder_last_active_at,
    p.boost_until,
    p.referred_by_code,
    p.created_at,
    p.updated_at,
    p.birth_year
  from public.profiles p
  where p.banned_at is null
    and (p_ids is null or p.id = any (p_ids));
$$;

revoke all on function public.get_profiles_public(uuid[]) from public;
grant execute on function public.get_profiles_public(uuid[]) to anon, authenticated;

create or replace function public.list_profiles_public()
returns table (
  id uuid,
  handle text,
  name text,
  age int,
  gender text,
  country text,
  city text,
  native_lang text,
  learning_lang text,
  level text,
  intents text[],
  interests text[],
  bio text,
  avatar_url text,
  photos text[],
  photos_locked boolean,
  occupation text,
  education text,
  zodiac text,
  chinese_variant text,
  photo_privacy text,
  tier text,
  verified boolean,
  online boolean,
  plan text,
  plan_expires_at timestamptz,
  is_founder boolean,
  founder_slot int,
  founder_last_active_at timestamptz,
  boost_until timestamptz,
  referred_by_code text,
  created_at timestamptz,
  updated_at timestamptz,
  birth_year int
)
language sql
stable
security definer
set search_path = public
as $$
  select * from public.get_profiles_public(null)
  order by online desc nulls last, updated_at desc nulls last;
$$;

revoke all on function public.list_profiles_public() from public;
grant execute on function public.list_profiles_public() to anon, authenticated;

create or replace function public.get_profile_public(p_id uuid)
returns table (
  id uuid,
  handle text,
  name text,
  age int,
  gender text,
  country text,
  city text,
  native_lang text,
  learning_lang text,
  level text,
  intents text[],
  interests text[],
  bio text,
  avatar_url text,
  photos text[],
  photos_locked boolean,
  occupation text,
  education text,
  zodiac text,
  chinese_variant text,
  photo_privacy text,
  tier text,
  verified boolean,
  online boolean,
  plan text,
  plan_expires_at timestamptz,
  is_founder boolean,
  founder_slot int,
  founder_last_active_at timestamptz,
  boost_until timestamptz,
  referred_by_code text,
  created_at timestamptz,
  updated_at timestamptz,
  birth_year int
)
language sql
stable
security definer
set search_path = public
as $$
  select * from public.get_profiles_public(array[p_id])
$$;

revoke all on function public.get_profile_public(uuid) from public;
grant execute on function public.get_profile_public(uuid) to anon, authenticated;
