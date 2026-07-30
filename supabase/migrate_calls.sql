-- TalkLov in-app voice/video calls (LiveKit media + Supabase signaling)
-- Run in Supabase SQL Editor.

create table if not exists public.calls (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  caller_id        uuid not null references public.profiles (id) on delete cascade,
  callee_id        uuid not null references public.profiles (id) on delete cascade,
  kind             text not null check (kind in ('audio', 'video')),
  status           text not null default 'ringing'
                   check (status in ('ringing', 'accepted', 'ended', 'missed', 'rejected')),
  livekit_room     text not null,
  created_at       timestamptz not null default now(),
  ended_at         timestamptz,
  constraint calls_distinct_users check (caller_id <> callee_id)
);

comment on table public.calls is
  '1:1 call invites; LiveKit room name in livekit_room. Media tokens issued by Next.js API.';

create index if not exists idx_calls_callee_status
  on public.calls (callee_id, status, created_at desc);

create index if not exists idx_calls_caller_status
  on public.calls (caller_id, status, created_at desc);

create index if not exists idx_calls_conversation
  on public.calls (conversation_id, created_at desc);

alter table public.calls enable row level security;

drop policy if exists calls_select_participant on public.calls;
create policy calls_select_participant on public.calls
  for select using (auth.uid() = caller_id or auth.uid() = callee_id);

drop policy if exists calls_insert_caller on public.calls;
create policy calls_insert_caller on public.calls
  for insert with check (
    auth.uid() = caller_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and c.status = 'accepted'
        and (
          (c.initiator_id = caller_id and c.recipient_id = callee_id)
          or (c.initiator_id = callee_id and c.recipient_id = caller_id)
        )
    )
  );

drop policy if exists calls_update_participant on public.calls;
create policy calls_update_participant on public.calls
  for update using (auth.uid() = caller_id or auth.uid() = callee_id)
  with check (auth.uid() = caller_id or auth.uid() = callee_id);

-- Realtime for ringing / status changes
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.calls;
    exception
      when duplicate_object then null;
    end;
  end if;
end $$;
