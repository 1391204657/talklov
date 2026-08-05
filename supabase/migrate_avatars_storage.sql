-- Public avatars bucket for Discover profile photos.
-- Run once in Supabase SQL Editor.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Newest real users first on Discover (when RPC path is used)
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
  order by
    (boost_until is not null and boost_until > now()) desc,
    created_at desc nulls last,
    online desc nulls last,
    updated_at desc nulls last;
$$;
