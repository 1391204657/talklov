-- Phone-first auth: one phone number → one TalkLov account
alter table public.profiles
  add column if not exists phone_e164 text;

-- Unique when present (nulls allowed for legacy email-only rows)
create unique index if not exists profiles_phone_e164_uidx
  on public.profiles (phone_e164)
  where phone_e164 is not null;

comment on column public.profiles.phone_e164 is
  'E.164 phone, e.g. +8613800138000. UNIQUE — one phone, one account.';

-- Also allow multi chinese variants (if not already applied)
alter table public.profiles drop constraint if exists profiles_chinese_variant_check;
