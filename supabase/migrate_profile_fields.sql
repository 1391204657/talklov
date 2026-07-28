-- TalkLov: add richer profile fields (run in Supabase SQL Editor after schema.sql)
alter table public.profiles
  add column if not exists occupation text,
  add column if not exists education text,
  add column if not exists zodiac text,
  add column if not exists photos text[] not null default '{}';

comment on column public.profiles.photos is 'Up to 3 photo URLs; avatar_url mirrors photos[1].';
comment on column public.profiles.zodiac is 'Western zodiac label, optional.';
