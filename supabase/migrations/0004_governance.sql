-- =====================================================================
-- 0004_governance.sql — Dawood Hospital voicebot
-- Compliance & governance: append-only audit_log, consent_log,
-- safety_events, and the dashboard admin allow-list.
-- REVIEW WITH LEGAL: retention + immutability rules live here.
-- Dropped vs hospitals/: integration_reliability, agent_versions,
-- agent_actions (POC tracks prompt versions in git, not the DB).
-- =====================================================================

-- ---- audit_log (append-only) ----------------------------------------
create table if not exists public.audit_log (
  id                 uuid primary key default gen_random_uuid(),
  conversation_id    uuid,                 -- loose reference (no FK: audit must outlive a deleted conversation)
  actor              text check (actor in ('agent', 'service', 'admin')),
  action             text not null,
  target_table       text,
  target_id          text,
  before_json        jsonb,
  after_json         jsonb,
  confirmation_token text,
  created_at         timestamptz not null default now()
);

create index if not exists idx_audit_log_target on public.audit_log (target_table, target_id);
create index if not exists idx_audit_log_created_at on public.audit_log (created_at desc);

-- Append-only: block UPDATE and DELETE at the row level. (TRUNCATE is
-- intentionally NOT blocked, so the seed's dev-only truncate guard still
-- works; production should additionally REVOKE TRUNCATE from app roles.)
create or replace function public.audit_log_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_log is append-only';
end;
$$;

drop trigger if exists trg_audit_log_no_update on public.audit_log;
create trigger trg_audit_log_no_update
  before update on public.audit_log
  for each row execute function public.audit_log_append_only();

drop trigger if exists trg_audit_log_no_delete on public.audit_log;
create trigger trg_audit_log_no_delete
  before delete on public.audit_log
  for each row execute function public.audit_log_append_only();

comment on table public.audit_log is
  'Append-only audit trail. Every write tool (book/reschedule/cancel) emits a row. Immutable via UPDATE/DELETE triggers.';

-- ---- consent_log -----------------------------------------------------
create table if not exists public.consent_log (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid,
  consent_type    text check (consent_type in ('recording', 'phi_sharing')),
  value           text check (value in ('yes', 'no', 'unclear')),
  captured_at     timestamptz not null default now(),
  utterance       text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_consent_log_conversation_id on public.consent_log (conversation_id);

comment on table public.consent_log is
  'Per-call consent capture. A "no" on recording triggers immediate handover. REVIEW WITH LEGAL.';

-- ---- safety_events ---------------------------------------------------
create table if not exists public.safety_events (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid,
  kind            text check (kind in ('guardrail_triggered', 'prompt_injection_attempt', 'pii_overshare', 'jailbreak')),
  severity        text check (severity in ('low', 'medium', 'high', 'critical')),
  detail          text,
  acknowledged_at timestamptz,
  acknowledged_by text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_safety_events_conversation_id on public.safety_events (conversation_id);
create index if not exists idx_safety_events_severity on public.safety_events (severity);

comment on table public.safety_events is
  'Guardrail / injection / PII-overshare / jailbreak events surfaced to the dashboard safety feed (realtime).';

-- ---- admin_users -----------------------------------------------------
create table if not exists public.admin_users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  full_name     text,
  role          text not null default 'admin' check (role in ('admin')),
  last_login_at timestamptz,
  active         boolean not null default true,
  created_at    timestamptz not null default now()
);

comment on table public.admin_users is
  'Allow-list of staff who may access the dashboard. Magic Link auth checks auth.email() against this table (see is_dashboard_admin in 0005).';
