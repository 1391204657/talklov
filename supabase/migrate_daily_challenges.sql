-- TalkLov daily_challenges (ops uploads ≤10s clips later)
-- Run in Supabase SQL Editor when ready to replace local seed pack.

create table if not exists public.daily_challenges (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  style_hint    text not null default '',
  active_on     date not null,
  audio_url     text,                    -- Storage URL; null → client TTS fallback
  line_en       text not null,
  line_zh       text not null,
  cloze_en      text not null,
  blank_word    text not null,
  choices       text[] not null,
  role_a_label  text not null default '英文角色',
  role_a_lang   text not null default 'en' check (role_a_lang in ('en','zh')),
  role_a_line   text not null,
  role_b_label  text not null default '中文角色',
  role_b_lang   text not null default 'zh' check (role_b_lang in ('en','zh')),
  role_b_line   text not null,
  created_at    timestamptz not null default now()
);

create unique index if not exists daily_challenges_active_on_uidx
  on public.daily_challenges (active_on);

alter table public.daily_challenges enable row level security;

drop policy if exists daily_challenges_select_all on public.daily_challenges;
create policy daily_challenges_select_all on public.daily_challenges
  for select using (true);

-- User duo takes (optional; MVP keeps takes in localStorage)
create table if not exists public.duo_takes (
  id              uuid primary key default gen_random_uuid(),
  challenge_id    uuid not null references public.daily_challenges (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  role            text not null check (role in ('a','b')),
  audio_url       text,
  seeking_partner boolean not null default true,
  partner_take_id uuid references public.duo_takes (id),
  created_at      timestamptz not null default now()
);

alter table public.duo_takes enable row level security;

drop policy if exists duo_takes_select_all on public.duo_takes;
create policy duo_takes_select_all on public.duo_takes
  for select using (true);

drop policy if exists duo_takes_insert_own on public.duo_takes;
create policy duo_takes_insert_own on public.duo_takes
  for insert with check (user_id = auth.uid());

drop policy if exists duo_takes_update_own on public.duo_takes;
create policy duo_takes_update_own on public.duo_takes
  for update using (user_id = auth.uid());
