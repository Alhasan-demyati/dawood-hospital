-- =====================================================================
-- 0005_indexes_and_rls.sql — Dawood Hospital voicebot
-- Section 1: hot-path indexes.
-- Section 2: one-active-visit-per-patient-per-day constraint.
-- Section 3: Row-Level Security on every table.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Section 1 — additional hot-path indexes
-- ---------------------------------------------------------------------
create index if not exists idx_visits_facility_specialty_start
  on public.visits (facility_id, specialty_id, scheduled_start);          -- availability queries

create index if not exists idx_conversations_outcome_started
  on public.conversations (outcome, started_at desc);                     -- dashboard filter chips

create index if not exists idx_tool_calls_tool_ok
  on public.tool_calls (tool_name, ok, created_at desc);

create index if not exists idx_patients_last_name_trgm
  on public.patients using gin (last_name gin_trgm_ops);                  -- find_patient name lookup

-- ---------------------------------------------------------------------
-- Section 2 — one active visit per patient, per facility, per day
-- ---------------------------------------------------------------------
-- NOTE: the spec's `date_trunc('day', scheduled_start)` is STABLE (its
-- result depends on the session TimeZone), and Postgres rejects STABLE
-- expressions in an index. The IMMUTABLE equivalent below pins the day
-- boundary to UTC, which is what we want for a single Asia/Amman site.
create unique index if not exists idx_visits_one_active_per_patient_per_day
  on public.visits (patient_id, facility_id, ((scheduled_start at time zone 'UTC')::date))
  where status in ('scheduled', 'checked_in');

-- facility_id is a no-op key today (single facility) but keeps the
-- constraint correct if a second Dawood branch is added later.

-- ---------------------------------------------------------------------
-- Section 3 — Row-Level Security
-- ---------------------------------------------------------------------
-- Admin gate. SECURITY DEFINER so the inner read of admin_users bypasses
-- RLS — this both centralizes the check and AVOIDS the infinite-recursion
-- Postgres would raise if the admin_users SELECT policy queried
-- admin_users under its own RLS.
create or replace function public.is_dashboard_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.email())
      and admin_users.active = true
  );
$$;

comment on function public.is_dashboard_admin() is
  'True when the current authenticated user''s email matches an active admin_users row. Used by every authenticated SELECT policy.';

-- Make the grant surface of the RLS gate intentional: only logged-in users
-- need it (anon policies don't call it; service_role bypasses RLS).
revoke execute on function public.is_dashboard_admin() from public;
grant execute on function public.is_dashboard_admin() to authenticated;

-- Enable RLS on every table (service_role bypasses RLS automatically).
alter table public.facilities               enable row level security;
alter table public.facility_hours           enable row level security;
alter table public.facility_holidays        enable row level security;
alter table public.specialties              enable row level security;
alter table public.chief_complaint_patterns enable row level security;
alter table public.visit_types              enable row level security;
alter table public.slot_templates           enable row level security;
alter table public.slot_overrides           enable row level security;
alter table public.patients                 enable row level security;
alter table public.visits                   enable row level security;
alter table public.visit_intake             enable row level security;
alter table public.conversations            enable row level security;
alter table public.turns                    enable row level security;
alter table public.tool_calls               enable row level security;
alter table public.handovers                enable row level security;
alter table public.outcomes                 enable row level security;
alter table public.customer_feedback        enable row level security;
alter table public.audit_log                enable row level security;
alter table public.consent_log              enable row level security;
alter table public.safety_events            enable row level security;
alter table public.admin_users              enable row level security;

-- ---- anon SELECT: only the public, non-PII reference tables ----------
drop policy if exists facilities_anon_select on public.facilities;
create policy facilities_anon_select on public.facilities
  for select to anon using (active = true);

drop policy if exists facility_hours_anon_select on public.facility_hours;
create policy facility_hours_anon_select on public.facility_hours
  for select to anon using (true);

drop policy if exists facility_holidays_anon_select on public.facility_holidays;
create policy facility_holidays_anon_select on public.facility_holidays
  for select to anon using (true);

drop policy if exists visit_types_anon_select on public.visit_types;
create policy visit_types_anon_select on public.visit_types
  for select to anon using (active = true);

drop policy if exists specialties_anon_select on public.specialties;
create policy specialties_anon_select on public.specialties
  for select to anon using (active = true);

-- chief_complaint_patterns, slot_templates, slot_overrides and ALL
-- operational/telemetry/governance tables get NO anon policy -> anon is
-- denied (RLS on + no matching policy = no rows). Patterns stay
-- service-role-only because they encode the triage heuristics.

-- ---- authenticated SELECT: admins may read everything ----------------
-- Writes never go through the browser; n8n uses service_role.
drop policy if exists facilities_admin_select on public.facilities;
create policy facilities_admin_select on public.facilities
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists facility_hours_admin_select on public.facility_hours;
create policy facility_hours_admin_select on public.facility_hours
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists facility_holidays_admin_select on public.facility_holidays;
create policy facility_holidays_admin_select on public.facility_holidays
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists specialties_admin_select on public.specialties;
create policy specialties_admin_select on public.specialties
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists chief_complaint_patterns_admin_select on public.chief_complaint_patterns;
create policy chief_complaint_patterns_admin_select on public.chief_complaint_patterns
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists visit_types_admin_select on public.visit_types;
create policy visit_types_admin_select on public.visit_types
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists slot_templates_admin_select on public.slot_templates;
create policy slot_templates_admin_select on public.slot_templates
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists slot_overrides_admin_select on public.slot_overrides;
create policy slot_overrides_admin_select on public.slot_overrides
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists patients_admin_select on public.patients;
create policy patients_admin_select on public.patients
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists visits_admin_select on public.visits;
create policy visits_admin_select on public.visits
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists visit_intake_admin_select on public.visit_intake;
create policy visit_intake_admin_select on public.visit_intake
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists conversations_admin_select on public.conversations;
create policy conversations_admin_select on public.conversations
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists turns_admin_select on public.turns;
create policy turns_admin_select on public.turns
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists tool_calls_admin_select on public.tool_calls;
create policy tool_calls_admin_select on public.tool_calls
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists handovers_admin_select on public.handovers;
create policy handovers_admin_select on public.handovers
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists outcomes_admin_select on public.outcomes;
create policy outcomes_admin_select on public.outcomes
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists customer_feedback_admin_select on public.customer_feedback;
create policy customer_feedback_admin_select on public.customer_feedback
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists audit_log_admin_select on public.audit_log;
create policy audit_log_admin_select on public.audit_log
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists consent_log_admin_select on public.consent_log;
create policy consent_log_admin_select on public.consent_log
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists safety_events_admin_select on public.safety_events;
create policy safety_events_admin_select on public.safety_events
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists admin_users_admin_select on public.admin_users;
create policy admin_users_admin_select on public.admin_users
  for select to authenticated using (public.is_dashboard_admin());
