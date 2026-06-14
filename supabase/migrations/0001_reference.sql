-- =====================================================================
-- 0001_reference.sql — Dawood Hospital voicebot
-- Reference / lookup data: facility, hours, holidays, specialties,
-- chief-complaint triage patterns, visit types, slot templates/overrides.
-- Idempotent: safe to re-run (create ... if not exists).
-- All timestamps are UTC (timestamptz); the app renders them in Asia/Amman.
-- =====================================================================

-- ---- Extensions ------------------------------------------------------
-- pgcrypto: gen_random_uuid().  pg_trgm: REQUIRED by suggest_specialty,
-- which scores chief complaints against chief_complaint_patterns with
-- trigram similarity (% operator + GIN index below).
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---- Shared updated_at trigger function ------------------------------
-- Attached only to tables whose rows actually change (facilities here;
-- patients/visits in 0002; conversations/outcomes in 0003).
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---- facilities ------------------------------------------------------
create table if not exists public.facilities (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  name_ar       text not null,
  name_en       text not null,
  address_line1 text,
  address_line2 text,
  city          text,
  country       text not null default 'JO',
  lat           numeric,
  lng           numeric,
  phone         text,
  services      text[],
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_facilities_city   on public.facilities (city);
create index if not exists idx_facilities_active  on public.facilities (active);

drop trigger if exists trg_facilities_updated_at on public.facilities;
create trigger trg_facilities_updated_at
  before update on public.facilities
  for each row execute function public.tg_set_updated_at();

comment on table public.facilities is
  'Hospital facilities. Schema supports multi-facility for future-proofing, but the Dawood POC seeds a single row (code=dawood_main).';
comment on column public.facilities.services is
  'Array of specialty codes offered at this facility (text[]).';

-- ---- facility_hours --------------------------------------------------
create table if not exists public.facility_hours (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid not null references public.facilities (id) on delete cascade,
  day_of_week  smallint not null check (day_of_week between 0 and 6),
  opens_at     time,
  closes_at    time,
  is_closed    boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (facility_id, day_of_week)
);

comment on table public.facility_hours is
  'Weekly opening hours per facility. day_of_week: 0=Sunday .. 6=Saturday (Jordanian convention).';

-- ---- facility_holidays ----------------------------------------------
create table if not exists public.facility_holidays (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid not null references public.facilities (id) on delete cascade,
  date         date not null,
  reason       text,
  created_at   timestamptz not null default now(),
  unique (facility_id, date)
);

comment on table public.facility_holidays is
  'Facility closure dates. Mixes fixed Gregorian dates with Hijri-shifting Eids — ops must review annually.';

-- ---- specialties (NEW vs hospitals/) --------------------------------
create table if not exists public.specialties (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  name_ar        text not null,
  name_en        text not null,
  color_hex      text,
  description_ar text,
  description_en text,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

create index if not exists idx_specialties_active on public.specialties (active);

comment on table public.specialties is
  'The 7 specialty clinics offered at Dawood Hospital. Used by suggest_specialty triage and by booking flows.';
comment on column public.specialties.color_hex is
  'Hex color for the dashboard specialty tiles (one per clinic).';

-- ---- chief_complaint_patterns (NEW vs hospitals/) -------------------
create table if not exists public.chief_complaint_patterns (
  id           uuid primary key default gen_random_uuid(),
  pattern_ar   text not null,
  pattern_en   text,
  specialty_id uuid not null references public.specialties (id) on delete cascade,
  weight       smallint not null default 1 check (weight between 1 and 5),
  created_at   timestamptz not null default now()
);

create index if not exists idx_chief_complaint_patterns_specialty_id
  on public.chief_complaint_patterns (specialty_id);

-- Trigram GIN index — powers suggest_specialty's `%` / similarity() matching.
create index if not exists idx_chief_complaint_patterns_pattern_ar_trgm
  on public.chief_complaint_patterns using gin (pattern_ar gin_trgm_ops);

comment on table public.chief_complaint_patterns is
  'Editable lookup table. Ops can tune triage by inserting / updating / deleting rows here without a code deploy.';
comment on column public.chief_complaint_patterns.pattern_en is
  'English mirror, for ops review only; NOT used in matching.';
comment on column public.chief_complaint_patterns.weight is
  'Strength of signal toward the specialty (1..5); higher wins ties in suggest_specialty.';

-- ---- visit_types -----------------------------------------------------
create table if not exists public.visit_types (
  id                       uuid primary key default gen_random_uuid(),
  code                     text not null unique,
  name_ar                  text not null,
  name_en                  text not null,
  default_duration_minutes integer not null default 30,
  specialty_id             uuid references public.specialties (id) on delete set null,
  requires_referral        boolean not null default false,
  active                   boolean not null default true,
  created_at               timestamptz not null default now()
);

comment on table public.visit_types is
  'Catalog of visit types. specialty_id is nullable — some types (e.g. new_consult_general) are cross-specialty.';

-- ---- slot_templates --------------------------------------------------
create table if not exists public.slot_templates (
  id            uuid primary key default gen_random_uuid(),
  facility_id   uuid not null references public.facilities (id) on delete cascade,
  specialty_id  uuid not null references public.specialties (id) on delete cascade,
  visit_type_id uuid references public.visit_types (id) on delete set null,
  day_of_week   smallint not null check (day_of_week between 0 and 6),
  start_time    time not null,
  end_time      time not null,
  rooms         smallint not null default 1 check (rooms > 0),
  created_at    timestamptz not null default now()
);

create index if not exists idx_slot_templates_facility_specialty_dow
  on public.slot_templates (facility_id, specialty_id, day_of_week);

comment on table public.slot_templates is
  'Recurring weekly availability windows per specialty. check_availability expands these into concrete slots.';

-- ---- slot_overrides --------------------------------------------------
create table if not exists public.slot_overrides (
  id              uuid primary key default gen_random_uuid(),
  facility_id     uuid not null references public.facilities (id) on delete cascade,
  specialty_id    uuid references public.specialties (id) on delete cascade,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  rooms_available smallint,
  reason          text,
  created_at      timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists idx_slot_overrides_facility_specialty_window
  on public.slot_overrides (facility_id, specialty_id, starts_at, ends_at);

comment on table public.slot_overrides is
  'One-off availability changes (closures, extra rooms). specialty_id NULL = applies to the whole facility (e.g. a holiday).';
