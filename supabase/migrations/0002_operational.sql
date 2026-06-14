-- =====================================================================
-- 0002_operational.sql — Dawood Hospital voicebot
-- The operational core: patients, visits, and per-visit intake.
-- visit_intake.chief_complaint is NOT NULL from the start (folded in
-- from hospitals/ migration 0008).
-- Dropped vs hospitals/: lab_orders, imaging_orders, preauths,
-- refill_requests, callback_requests (out of scope for Dawood).
-- =====================================================================

-- ---- patients --------------------------------------------------------
create table if not exists public.patients (
  id                  uuid primary key default gen_random_uuid(),
  mrn                 text unique,
  national_id_hash    text,
  first_name          text not null,
  last_name           text not null,
  dob                 date,
  -- Nullable + unique: adults each carry a unique Jordan E.164 phone;
  -- minors reached via a guardian may have NULL here (multiple NULLs are
  -- allowed under a UNIQUE constraint in Postgres).
  phone_e164          text unique,
  email               text,
  language            text not null default 'ar' check (language in ('ar', 'en')),
  preferred_contact   text not null default 'sms' check (preferred_contact in ('sms', 'whatsapp', 'email')),
  is_minor            boolean not null default false,
  guardian_patient_id uuid references public.patients (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- phone_e164 + mrn are already indexed by their UNIQUE constraints.
create index if not exists idx_patients_last_name on public.patients (last_name);

drop trigger if exists trg_patients_updated_at on public.patients;
create trigger trg_patients_updated_at
  before update on public.patients
  for each row execute function public.tg_set_updated_at();

comment on table public.patients is
  'Patient master. Phone (E.164) is the primary identifier; national_id_hash stores only a hash — never the raw Jordanian national ID.';
comment on column public.patients.guardian_patient_id is
  'Self-FK: for a minor, points at the responsible adult patient row.';

-- ---- visits ----------------------------------------------------------
create table if not exists public.visits (
  id                  uuid primary key default gen_random_uuid(),
  booking_reference   text not null unique,                 -- format DV-XXXXX
  patient_id          uuid not null references public.patients (id) on delete cascade,
  facility_id         uuid not null references public.facilities (id) on delete restrict,
  specialty_id        uuid not null references public.specialties (id) on delete restrict,
  visit_type_id       uuid references public.visit_types (id) on delete set null,
  scheduled_start     timestamptz not null,
  scheduled_end       timestamptz not null,
  status              text not null
                        check (status in ('scheduled', 'checked_in', 'in_room', 'discharged', 'cancelled', 'no_show')),
  physician_id        text,        -- POC keeps physicians as a free-text label
  referring_physician text,
  notes               text,
  cancellation_reason text,
  is_follow_up        boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_visits_patient_id      on public.visits (patient_id);
create index if not exists idx_visits_facility_id     on public.visits (facility_id);
create index if not exists idx_visits_specialty_id    on public.visits (specialty_id);
create index if not exists idx_visits_scheduled_start on public.visits (scheduled_start);
create index if not exists idx_visits_status          on public.visits (status);

drop trigger if exists trg_visits_updated_at on public.visits;
create trigger trg_visits_updated_at
  before update on public.visits
  for each row execute function public.tg_set_updated_at();

comment on table public.visits is
  'Outpatient appointments — the main operational record. booking_reference is the caller-facing code (DV-XXXXX).';

-- ---- visit_intake ----------------------------------------------------
create table if not exists public.visit_intake (
  id                    uuid primary key default gen_random_uuid(),
  visit_id              uuid not null unique references public.visits (id) on delete cascade,
  chief_complaint       text not null,
  symptom_duration_days integer,
  pregnancy_status      boolean,
  pediatric_weight_kg   numeric,
  allergy_notes         text,
  suggested_specialty_id uuid references public.specialties (id) on delete set null,
  picked_by             text not null default 'patient'
                          check (picked_by in ('patient', 'bot_suggestion', 'staff_override')),
  payer_name            text,   -- free-text insurance partner; no payer FK in the simplified pack
  created_at            timestamptz not null default now()
);

comment on table public.visit_intake is
  'Per-visit triage capture (1:1 with visits). chief_complaint is mandatory.';
comment on column public.visit_intake.suggested_specialty_id is
  'What suggest_specialty returned, if it was called (nullable).';
comment on column public.visit_intake.picked_by is
  'Who chose the specialty: patient = caller named the clinic directly; bot_suggestion = caller accepted suggest_specialty output; staff_override = a dashboard user re-routed the visit later.';
