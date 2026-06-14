-- =====================================================================
-- 0003_telemetry.sql — Dawood Hospital voicebot
-- Call telemetry: conversations, turns, tool_calls, handovers,
-- outcomes, customer_feedback. Populated at runtime by ElevenLabs
-- webhooks + n8n — NOT seeded.
-- =====================================================================

-- ---- conversations ---------------------------------------------------
-- Single table covering both the telephony envelope and the semantic
-- conversation (the recommended single-table shape).
create table if not exists public.conversations (
  id                        uuid primary key default gen_random_uuid(),
  started_at                timestamptz not null default now(),
  ended_at                  timestamptz,
  caller_phone              text,
  patient_id                uuid references public.patients (id) on delete set null,
  elevenlabs_conversation_id text unique,
  outcome                   text check (outcome in ('completed_automated', 'completed_with_handover', 'abandoned', 'error')),
  language                  text not null default 'ar' check (language in ('ar', 'en')),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists idx_conversations_started_at on public.conversations (started_at desc);
create index if not exists idx_conversations_patient_id on public.conversations (patient_id);

drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at
  before update on public.conversations
  for each row execute function public.tg_set_updated_at();

comment on table public.conversations is
  'One row per inbound call: telephony envelope + semantic outcome. Drives the dashboard "recent calls" feed.';

-- ---- turns -----------------------------------------------------------
create table if not exists public.turns (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  turn_index      integer not null,
  speaker         text not null check (speaker in ('agent', 'user')),
  text_raw        text,
  text_normalized text,
  language        text,
  intent          text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_turns_conversation_id_turn_index
  on public.turns (conversation_id, turn_index);

comment on table public.turns is
  'Every agent<->caller turn, for the dashboard transcript view. Written by the log_conversation_turn webhook.';

-- ---- tool_calls ------------------------------------------------------
create table if not exists public.tool_calls (
  id                 uuid primary key default gen_random_uuid(),
  conversation_id    uuid references public.conversations (id) on delete cascade,
  tool_name          text not null,
  request_json       jsonb,
  response_json      jsonb,
  ok                 boolean,
  error_code         text,
  latency_ms         integer,
  confirmation_token text,
  created_at         timestamptz not null default now()
);

create index if not exists idx_tool_calls_conversation_id_created_at
  on public.tool_calls (conversation_id, created_at);
create index if not exists idx_tool_calls_tool_name
  on public.tool_calls (tool_name);

comment on table public.tool_calls is
  'Audit trail of every n8n tool invocation in a call (request/response, latency, error_code).';

-- ---- handovers -------------------------------------------------------
create table if not exists public.handovers (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null unique references public.conversations (id) on delete cascade,
  reason_code     text not null check (reason_code in (
                    'consent_declined',
                    'out_of_scope',
                    'customer_request',
                    'low_confidence',
                    'repeated_failure',
                    'patient_not_found',
                    'safety',
                    'specialty_unclear'   -- NEW for Dawood: triage couldn't match
                  )),
  summary_ar      text,
  customer_data   jsonb,
  target_agent_id text,                          -- phone number or queue ref
  triggered_at    timestamptz not null default now(),
  completed_at    timestamptz,
  created_at      timestamptz not null default now()
);

comment on table public.handovers is
  'At most one handover per call (conversation_id unique). reason_code is a fixed allow-list.';
comment on column public.handovers.reason_code is
  'specialty_unclear fires in UC-D2 when suggest_specialty has no confident match AND the caller cannot name a clinic.';

-- ---- outcomes --------------------------------------------------------
create table if not exists public.outcomes (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null unique references public.conversations (id) on delete cascade,
  use_case        text check (use_case in ('UC-D1', 'UC-D2', 'UC-D3', 'UC-D4')),
  goal_achieved   boolean,
  ces             smallint check (ces between 1 and 10),
  ces_declined    boolean not null default false,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_outcomes_updated_at on public.outcomes;
create trigger trg_outcomes_updated_at
  before update on public.outcomes
  for each row execute function public.tg_set_updated_at();

comment on table public.outcomes is
  'End-of-call summary written by post_call_finalize: which use case, goal achieved, CES.';

-- ---- customer_feedback ----------------------------------------------
create table if not exists public.customer_feedback (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  channel         text not null default 'voice',
  ces             smallint check (ces between 1 and 10),
  declined        boolean not null default false,
  free_text       text,
  created_at      timestamptz not null default now()
);

comment on table public.customer_feedback is
  'Customer Effort Score capture (submit_ces_rating). One+ rows per conversation.';
