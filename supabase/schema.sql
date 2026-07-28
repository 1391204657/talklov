-- =============================================================
-- TalkLov (talklov.com) — Supabase schema
-- Tables: profiles, conversations, icebreakers, messages
-- Includes: RLS policies, indexes, updated_at triggers,
--           auto-create profile on signup, Realtime publication.
--
-- How to run:
--   Supabase Dashboard → SQL Editor → paste this whole file → Run.
-- It is idempotent-ish (drops policies before recreating) so you
-- can re-run after edits.
-- =============================================================

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- -------------------------------------------------------------
-- 1) profiles  (1:1 with auth.users)
-- -------------------------------------------------------------
create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  handle         text unique,                       -- @handle used for the photo watermark
  name           text not null default '',
  age            int  check (age is null or age between 18 and 120),
  gender         text check (gender in ('male','female','other')),
  country        text,                              -- 'CN' | 'US' | ...
  city           text,
  native_lang    text default 'English',
  learning_lang  text default '中文',
  level          text,                              -- 'Beginner' | 'Intermediate' | ...
  intents        text[] not null default '{language}',  -- language | friends | romance
  interests      text[] not null default '{}',
  bio            text default '',
  avatar_url     text,
  photos         text[] not null default '{}',
  occupation     text,
  education      text,
  zodiac         text,
  chinese_variant text check (chinese_variant in ('mandarin','cantonese')),
  photo_privacy  text not null default 'public'
                 check (photo_privacy in ('public','loggedIn','verified')),
  tier           text not null default 'light'
                 check (tier in ('light','verified')),
  verified       boolean not null default false,
  online         boolean not null default false,
  phone_e164     text,                              -- E.164; UNIQUE one phone → one account
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.profiles is 'User profile, one row per auth user.';
create unique index if not exists profiles_phone_e164_uidx
  on public.profiles (phone_e164)
  where phone_e164 is not null;

-- -------------------------------------------------------------
-- 2) conversations  (a thread between two users, female-first gated)
-- -------------------------------------------------------------
create table if not exists public.conversations (
  id            uuid primary key default gen_random_uuid(),
  initiator_id  uuid not null references public.profiles (id) on delete cascade,
  recipient_id  uuid not null references public.profiles (id) on delete cascade,
  status        text not null default 'pending'
                check (status in ('pending','accepted','declined','blocked')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_message_at timestamptz,
  constraint conversations_distinct_users check (initiator_id <> recipient_id),
  constraint conversations_unique_pair unique (initiator_id, recipient_id)
);

comment on table public.conversations is
  'One thread per (initiator, recipient). status=pending until recipient accepts the icebreaker.';

-- -------------------------------------------------------------
-- 3) icebreakers  (the opening message that goes into the recipient queue)
-- -------------------------------------------------------------
create table if not exists public.icebreakers (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  recipient_id    uuid not null references public.profiles (id) on delete cascade,
  text            text not null,
  status          text not null default 'pending'
                  check (status in ('pending','accepted','declined')),
  created_at      timestamptz not null default now()
);

comment on table public.icebreakers is
  'Female-first opener: sender writes one message; it waits in recipient queue until accepted.';

-- -------------------------------------------------------------
-- 4) messages  (real conversation messages after acceptance)
-- -------------------------------------------------------------
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  kind            text not null default 'text' check (kind in ('text','voice')),
  content         text,               -- text body (null allowed for pure voice)
  audio_url       text,               -- storage path/URL for voice messages
  duration_sec    int,
  translation     text,
  flagged         boolean not null default false,
  created_at      timestamptz not null default now()
);

comment on table public.messages is 'Chat messages (text or voice) within an accepted conversation.';

-- -------------------------------------------------------------
-- Indexes
-- -------------------------------------------------------------
create index if not exists idx_conversations_initiator on public.conversations (initiator_id);
create index if not exists idx_conversations_recipient on public.conversations (recipient_id);
create index if not exists idx_conversations_last_msg  on public.conversations (last_message_at desc);
create index if not exists idx_icebreakers_recipient   on public.icebreakers (recipient_id, status);
create index if not exists idx_messages_conversation    on public.messages (conversation_id, created_at);

-- =============================================================
-- updated_at trigger
-- =============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_conversations_updated on public.conversations;
create trigger trg_conversations_updated before update on public.conversations
  for each row execute function public.set_updated_at();

-- =============================================================
-- Keep conversation.last_message_at fresh on new message
-- =============================================================
create or replace function public.bump_conversation_on_message()
returns trigger language plpgsql security definer as $$
begin
  update public.conversations
     set last_message_at = new.created_at,
         updated_at = now()
   where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists trg_bump_conversation on public.messages;
create trigger trg_bump_conversation after insert on public.messages
  for each row execute function public.bump_conversation_on_message();

-- =============================================================
-- Auto-create a profile row when a new auth user signs up.
-- Reads optional name/handle from user metadata.
-- =============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, handle)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'handle', 'user_' || substr(new.id::text, 1, 8))
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- Row Level Security
-- =============================================================
alter table public.profiles      enable row level security;
alter table public.conversations enable row level security;
alter table public.icebreakers   enable row level security;
alter table public.messages      enable row level security;

-- ---------- profiles ----------
-- Anyone (incl. guests / anon) may browse profiles for Discover.
-- Column-level privacy (blurring photos) is enforced in the app;
-- tighten this later if you want photo columns protected server-side.
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles
  for select using (true);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles
  for delete using (id = auth.uid());

-- ---------- conversations ----------
-- Only the two participants can see / touch a conversation.
drop policy if exists conversations_select_participant on public.conversations;
create policy conversations_select_participant on public.conversations
  for select using (auth.uid() in (initiator_id, recipient_id));

drop policy if exists conversations_insert_initiator on public.conversations;
create policy conversations_insert_initiator on public.conversations
  for insert with check (initiator_id = auth.uid());

-- Either participant may update (recipient accepts/declines/blocks).
drop policy if exists conversations_update_participant on public.conversations;
create policy conversations_update_participant on public.conversations
  for update using (auth.uid() in (initiator_id, recipient_id))
  with check (auth.uid() in (initiator_id, recipient_id));

-- ---------- icebreakers ----------
drop policy if exists icebreakers_select_participant on public.icebreakers;
create policy icebreakers_select_participant on public.icebreakers
  for select using (auth.uid() in (sender_id, recipient_id));

drop policy if exists icebreakers_insert_sender on public.icebreakers;
create policy icebreakers_insert_sender on public.icebreakers
  for insert with check (sender_id = auth.uid());

-- Recipient accepts / declines the opener.
drop policy if exists icebreakers_update_recipient on public.icebreakers;
create policy icebreakers_update_recipient on public.icebreakers
  for update using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- ---------- messages ----------
-- Readable by conversation participants.
drop policy if exists messages_select_participant on public.messages;
create policy messages_select_participant on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.initiator_id, c.recipient_id)
    )
  );

-- Insert only if you are the sender AND the conversation is accepted.
drop policy if exists messages_insert_accepted on public.messages;
create policy messages_insert_accepted on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and c.status = 'accepted'
        and auth.uid() in (c.initiator_id, c.recipient_id)
    )
  );

-- =============================================================
-- Realtime: broadcast row changes for chat + queue
-- =============================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
    alter publication supabase_realtime add table public.icebreakers;
    alter publication supabase_realtime add table public.conversations;
  end if;
exception when duplicate_object then
  null;  -- table already in publication
end $$;
