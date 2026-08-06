-- Flash Check (AWS Face Liveness) fields on verification_requests.
-- Run after migrate_verification.sql. Product name: 闪验 / Flash Check (not「活体」in UI).

alter table public.verification_requests
  add column if not exists liveness_score numeric,
  add column if not exists liveness_session_id text,
  add column if not exists liveness_provider text;

comment on column public.verification_requests.liveness_score is
  'Flash Check confidence 0–100 from AWS Rekognition Face Liveness.';
comment on column public.verification_requests.liveness_session_id is
  'AWS Face Liveness SessionId.';
comment on column public.verification_requests.liveness_provider is
  'e.g. aws_rekognition | manual_selfie';

create index if not exists idx_verification_liveness_session
  on public.verification_requests (liveness_session_id)
  where liveness_session_id is not null;
