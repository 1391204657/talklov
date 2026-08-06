-- Photo privacy gate: strip avatar_url / photos for unauthorized viewers.
-- Run in Supabase SQL Editor after migrate_profile_privacy_harden.sql.
-- Note: already-public HTTPS URLs remain fetchable if known; this stops listing them.

create or replace function public.viewer_may_see_photos(
  p_owner_id uuid,
  p_privacy text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is not null and auth.uid() = p_owner_id then true
    when coalesce(p_privacy, 'public') = 'public' then true
    when p_privacy = 'loggedIn' then auth.uid() is not null
    when p_privacy = 'verified' then exists (
      select 1
      from public.profiles v
      where v.id = auth.uid()
        and v.verified is true
    )
    else false
  end;
$$;

revoke all on function public.viewer_may_see_photos(uuid, text) from public;
grant execute on function public.viewer_may_see_photos(uuid, text) to anon, authenticated;

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
  updated_at timestamptz
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
    p.age,
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
    p.updated_at
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
  updated_at timestamptz
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
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select * from public.get_profiles_public(array[p_id]);
$$;

revoke all on function public.get_profile_public(uuid) from public;
grant execute on function public.get_profile_public(uuid) to anon, authenticated;

-- Stop direct column reads of photo URLs (service_role / table owner still OK)
revoke select (avatar_url) on table public.profiles from anon, authenticated;
revoke select (photos) on table public.profiles from anon, authenticated;

comment on function public.get_profiles_public(uuid[]) is
  'Public profile rows with avatar_url/photos stripped per photo_privacy + viewer.';
comment on column public.profiles.avatar_url is
  'Not selectable by anon/authenticated; use get_profile(s)_public RPCs.';
comment on column public.profiles.photos is
  'Not selectable by anon/authenticated; use get_profile(s)_public RPCs.';
