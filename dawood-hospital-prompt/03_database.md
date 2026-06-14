<!-- Dawood Hospital simplification of hospitals/03_database.md
     drops: migrations 0005_agent_ops (agent_versions/agent_actions), 0007_kpi_views,
            0008_visit_intake (folded into 0001/0002), 0009_one_active_visit (folded into 0005),
            0010_per_dependent; drops tables lab_orders, imaging_orders, preauths,
            refill_requests, callback_requests, integration_reliability, agent_versions,
            agent_actions; drops multi-region facility seed (KSA + UAE → single Dawood row);
            drops dropped-UC reason_codes (medical_advice_requested, controlled_substance_refill,
            abnormal_result_no_clinician, after_hours_emergency); drops Cerner/Epic/NPHIES/
            Malaffi/Riayati from any narrative
     adds: specialties table (7 rows), chief_complaint_patterns table with pg_trgm GIN index,
           specialty_unclear reason_code, suggested_specialty_id + picked_by columns on
           visit_intake, Jordan-flavored seed (Jordanian names, +962 phones, Asia/Amman),
           anon read on specialties -->

# STEP 03 — قاعدة البيانات (6 SQL migrations + Jordan seed)

> Prerequisites: steps 01 (master briefing) and 02 (scaffold) complete.
> Verify by listing `apps/`, `packages/`, and root `package.json` — all
> present. The `supabase/` folder exists (created in step 02) but contains
> only a placeholder `.gitkeep` or empty `migrations/` directory.
>
> Scope of THIS prompt: produce all **6** Supabase SQL migrations + a
> single `seed.sql` + a short `supabase/README.md`. Pure SQL only. **No
> application code**, no n8n workflows, no KB articles — those come in
> later steps.

## What to produce

Under `supabase/`:

```
supabase/
├── migrations/
│   ├── 0001_reference.sql
│   ├── 0002_operational.sql
│   ├── 0003_telemetry.sql
│   ├── 0004_governance.sql
│   ├── 0005_indexes_and_rls.sql
│   └── 0006_realtime.sql
├── seed.sql
└── README.md         (how to apply locally + on a hosted Supabase project)
```

Six migrations total. Half what the full hospitals/ pack ships — because
this Dawood pack drops labs, imaging, pre-auth, refills, callbacks,
integration reliability tracking, agent-version history, and KPI
materialised views. Those are workstreams the simplified POC doesn't
need.

## Conventions (apply across all migrations)

- `create table if not exists` (idempotent re-runs).
- UUID primary keys via `gen_random_uuid()`; enable `pgcrypto` once in
  0001.
- `text` over `varchar(N)`. `timestamptz` over `timestamp`. `numeric`
  over `float`/`real` for money/coords.
- `created_at timestamptz not null default now()` on every table.
  `updated_at` only where rows actually change (visits, conversations,
  outcomes).
- Naming: `snake_case` tables and columns. Foreign keys `<table>_id`.
- Indexes named `idx_<table>_<columns>`.
- Use Postgres ENUMs sparingly. Prefer `text` + a `check (col in (…))`
  constraint — easier to migrate than ENUM types.
- Comment every table with `comment on table … is '…'` and every
  non-obvious column.
- All times are stored in UTC (`timestamptz`); the app layer renders
  them in `Asia/Amman` (set per the master briefing).

## Migration content (specification — produce full SQL)

### 0001_reference.sql

Enable extensions at the very top:

```sql
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
```

`pg_trgm` is **required** — `suggest_specialty` uses trigram similarity
to score chief complaints against patterns.

Tables:

- `facilities` — `id, code (unique), name_ar, name_en, address_line1,
  address_line2, city, country (default 'JO'), lat (numeric, nullable),
  lng (numeric, nullable), phone, services (text[]), active (bool default
  true), created_at, updated_at`. **Single-row table** in practice
  (Dawood Hospital). Indexes on `city`, `active`. Comment that the
  table supports multi-facility for future-proofing but the POC seeds a
  single row.

- `facility_hours` — `id, facility_id, day_of_week (0–6, 0=Sunday per
  Jordanian convention), opens_at (time), closes_at (time), is_closed
  (bool default false), created_at`. Unique `(facility_id, day_of_week)`.

- `facility_holidays` — `id, facility_id, date, reason, created_at`.
  Unique `(facility_id, date)`. Seed Jordanian public holidays for the
  current year.

- `specialties` — **NEW** vs hospitals/. The 7 Dawood clinics.
  - `id uuid primary key default gen_random_uuid()`
  - `code text unique not null` — e.g. `cardiology`, `ent`,
    `internal_medicine`, `ophthalmology`, `pediatrics`, `dentistry`,
    `dermatology`
  - `name_ar text not null`
  - `name_en text not null`
  - `color_hex text` — for the dashboard tiles (1 hex color per clinic)
  - `description_ar text`
  - `description_en text`
  - `active boolean not null default true`
  - `created_at timestamptz not null default now()`
  - Index on `active`.
  - Comment: "The 7 specialty clinics offered at Dawood Hospital.
    Used by suggest_specialty triage and by booking flows."

- `chief_complaint_patterns` — **NEW** vs hospitals/. Training data
  for `suggest_specialty`.
  - `id uuid primary key default gen_random_uuid()`
  - `pattern_ar text not null` — the Arabic substring / phrase to
    match (e.g. "ألم في الصدر")
  - `pattern_en text` — English mirror, for ops review only; not used
    in matching
  - `specialty_id uuid not null references specialties(id) on delete
    cascade`
  - `weight smallint not null default 1` — higher weight = stronger
    signal toward that specialty (range 1..5)
  - `created_at timestamptz not null default now()`
  - Index on `specialty_id`.
  - GIN index using `pg_trgm` on `pattern_ar`:
    `create index idx_chief_complaint_patterns_pattern_ar_trgm on
    chief_complaint_patterns using gin (pattern_ar gin_trgm_ops);`
  - Comment: "Editable lookup table. Ops can tune triage by inserting /
    updating / deleting rows here without a code deploy."

- `visit_types` — `id, code (unique), name_ar, name_en,
  default_duration_minutes (default 30), specialty_id (FK to specialties,
  nullable — some visit types like 'general_outpatient' are
  cross-specialty), requires_referral (bool default false), active (bool
  default true), created_at`. Examples seeded: `new_consult_general`,
  `follow_up_general`, `new_consult_pediatric`, `follow_up_pediatric`,
  `new_consult_cardiology`, `dental_checkup`, `eye_exam`,
  `dermatology_consult`.

- `slot_templates` — `id, facility_id, specialty_id (FK to specialties),
  visit_type_id (FK, nullable), day_of_week (0=Sunday), start_time,
  end_time, rooms (smallint > 0, default 1), created_at`. Index
  `(facility_id, specialty_id, day_of_week)`.

- `slot_overrides` — `id, facility_id, specialty_id (FK, nullable —
  null means override applies to the whole facility, e.g. a holiday),
  starts_at (tstz), ends_at (tstz), rooms_available (smallint),
  reason, created_at`. Check `ends_at > starts_at`. Index `(facility_id,
  specialty_id, starts_at, ends_at)`.

**Folded in from hospitals/ migration 0008**: define `visit_intake` here
later in 0002 with the tightened `chief_complaint NOT NULL` from the
start — no separate migration needed.

### 0002_operational.sql

Tables:

- `patients` — `id, mrn (text unique nullable), national_id_hash (text,
  hash of Jordanian national ID — never store the raw), first_name,
  last_name, dob (date), phone_e164 (text unique — Jordan E.164 like
  `+9627XXXXXXXX`), email (nullable), language (text default 'ar' check
  in ('ar','en')), preferred_contact (text check in ('sms','whatsapp',
  'email') default 'sms'), is_minor (bool default false),
  guardian_patient_id (uuid nullable, self-FK), created_at, updated_at`.
  Indexes on `phone_e164` (already unique → btree), `mrn`, `last_name`.

- `visits` — `id, booking_reference (text unique, format `DV-XXXXX`),
  patient_id, facility_id, specialty_id (FK to specialties), visit_type_id
  (FK, nullable), scheduled_start (tstz), scheduled_end (tstz),
  status (text not null check in ('scheduled', 'checked_in', 'in_room',
  'discharged', 'cancelled', 'no_show')), physician_id (text nullable —
  POC keeps physicians as a free-text label), referring_physician (text
  nullable), notes (text nullable), cancellation_reason (text nullable),
  is_follow_up (bool default false), created_at, updated_at`. Indexes
  on `patient_id`, `facility_id`, `specialty_id`, `scheduled_start`,
  `status`.

- `visit_intake` — `id, visit_id (FK, unique), chief_complaint **(text
  NOT NULL)**, symptom_duration_days (int nullable),
  pregnancy_status (bool nullable), pediatric_weight_kg (numeric
  nullable), allergy_notes (text nullable), suggested_specialty_id
  (uuid FK to specialties, nullable — what `suggest_specialty` returned,
  if it was called), picked_by (text not null check in ('patient',
  'bot_suggestion', 'staff_override') default 'patient'), payer_name
  (text nullable — free-text insurance partner; no payer FK in the
  simplified pack), created_at`.
  - Comment on `picked_by`: "Records who chose the specialty for this
    visit. `patient` = caller named the clinic directly. `bot_suggestion`
    = caller accepted the bot's suggest_specialty output.
    `staff_override` = a dashboard user re-routed the visit later."

**Dropped vs hospitals/**: `lab_orders`, `imaging_orders`, `preauths`,
`refill_requests`, `callback_requests`. Those are out of scope for the
Dawood simplified pack.

### 0003_telemetry.sql

Tables:

- `conversations` — single table covering both telephony envelope and
  semantic conversation (recommended single-table shape from the full
  pack).
  - `id, started_at, ended_at (nullable), caller_phone (text),
    patient_id (uuid FK nullable), elevenlabs_conversation_id (text
    unique), outcome (text check in ('completed_automated',
    'completed_with_handover', 'abandoned', 'error')), language (text
    default 'ar' check in ('ar','en')), created_at, updated_at`.
  - Index on `started_at desc` for the dashboard's "recent calls" view.
  - Index on `patient_id`.

- `turns` — `id, conversation_id (FK), turn_index (int), speaker (text
  check in ('agent','user')), text_raw (text), text_normalized (text
  nullable), language (text), intent (text nullable), created_at`.
  Composite index `(conversation_id, turn_index)`.

- `tool_calls` — `id, conversation_id (FK), tool_name (text),
  request_json (jsonb), response_json (jsonb), ok (bool), error_code
  (text nullable), latency_ms (int), confirmation_token (text nullable),
  created_at`. Indexes on `(conversation_id, created_at)` and `tool_name`.

- `handovers` — `id, conversation_id (FK unique — at most one handover
  per call), reason_code (text not null check in fixed list — see
  below), summary_ar (text), customer_data (jsonb), target_agent_id
  (text nullable — phone number or queue ref), triggered_at, completed_at
  (nullable)`.

- `outcomes` — `id, conversation_id (FK unique), use_case (text check in
  ('UC-D1','UC-D2','UC-D3','UC-D4')), goal_achieved (bool), ces (smallint
  nullable check (ces between 1 and 10)), ces_declined (bool default
  false), notes (text nullable), created_at`.

- `customer_feedback` — `id, conversation_id (FK), channel (text default
  'voice'), ces (smallint check (ces between 1 and 10)), declined (bool
  default false), free_text (text nullable), created_at`.

`handovers.reason_code` allowed values (shorter list than hospitals/):

```sql
check (reason_code in (
  'consent_declined',
  'out_of_scope',
  'customer_request',
  'low_confidence',
  'repeated_failure',
  'patient_not_found',
  'safety',
  'specialty_unclear'   -- NEW for Dawood: triage couldn't match
))
```

Note `specialty_unclear` — triggered by UC-D2 when `suggest_specialty`
returns no confident match AND the caller can't name a clinic.

### 0004_governance.sql

Tables:

- `audit_log` — `id, conversation_id (uuid nullable), actor (text — one
  of 'agent', 'service', 'admin'), action (text), target_table (text),
  target_id (text), before_json (jsonb nullable), after_json (jsonb
  nullable), confirmation_token (text nullable), created_at`.
  - **Append-only** via a trigger that raises an exception on UPDATE or
    DELETE:
    ```sql
    create or replace function audit_log_append_only()
    returns trigger language plpgsql as $$
    begin
      raise exception 'audit_log is append-only';
    end $$;
    create trigger trg_audit_log_no_update before update on audit_log
      for each row execute function audit_log_append_only();
    create trigger trg_audit_log_no_delete before delete on audit_log
      for each row execute function audit_log_append_only();
    ```
  - Indexes on `(target_table, target_id)` and `created_at desc`.

- `consent_log` — `id, conversation_id, consent_type (text check in
  ('recording','phi_sharing')), value (text check in ('yes','no',
  'unclear')), captured_at, utterance (text nullable), created_at`.

- `safety_events` — `id, conversation_id, kind (text check in
  ('guardrail_triggered','prompt_injection_attempt','pii_overshare',
  'jailbreak')), severity (text check in ('low','medium','high',
  'critical')), detail (text), acknowledged_at (tstz nullable),
  acknowledged_by (text nullable), created_at`.

- `admin_users` — `id, email (text unique), full_name, role (text check
  in ('admin') default 'admin'), last_login_at (tstz nullable), active
  (bool default true), created_at`.
  - Comment: "Allow-list of staff who may access the dashboard. Magic
    Link auth checks `auth.email()` against this table."

**Dropped vs hospitals/**: `integration_reliability` (no external EHR
integrations to monitor), `agent_versions` + `agent_actions` (POC
doesn't track agent prompt versions in DB — git history suffices).

### 0005_indexes_and_rls.sql

Two sections in this one file.

#### Section 1 — additional indexes

Hot-path indexes not already declared inline above:

- `idx_visits_facility_specialty_start on visits (facility_id,
  specialty_id, scheduled_start)` — drives availability queries.
- `idx_conversations_outcome_started on conversations (outcome,
  started_at desc)` — drives dashboard filter chips.
- `idx_tool_calls_tool_ok on tool_calls (tool_name, ok, created_at desc)`.
- Trigram functional index on patient names if you didn't already:
  `create index idx_patients_last_name_trgm on patients using gin
  (last_name gin_trgm_ops);` — for the find_patient name lookup.

#### Section 2 — one_active_visit constraint (folded in from hospitals/ 0009)

Partial unique index to prevent a patient from holding two active visits
on the same day at Dawood:

```sql
create unique index if not exists idx_visits_one_active_per_patient_per_day
  on visits (patient_id, facility_id, date_trunc('day', scheduled_start))
  where status in ('scheduled', 'checked_in');
```

Since the POC has a single facility, `facility_id` in the key is a no-op
today but keeps the constraint correct if a second Dawood branch is
added later.

#### Section 3 — RLS policies

**Enable RLS on every table** (`alter table … enable row level
security`).

Policy matrix:

- `anon` (the unauthenticated browser-safe role) may **SELECT** from:
  - `facilities` where `active = true`
  - `facility_hours`
  - `facility_holidays`
  - `visit_types` where `active = true`
  - `specialties` where `active = true`   ← NEW

- `anon` may **NOT** read anything from: `patients`, `visits`,
  `visit_intake`, `conversations`, `turns`, `tool_calls`, `handovers`,
  `outcomes`, `customer_feedback`, `audit_log`, `consent_log`,
  `safety_events`, `admin_users`, `chief_complaint_patterns`,
  `slot_templates`, `slot_overrides`.

  (`chief_complaint_patterns` stays service-role-only because it's the
  triage training data and could leak the bot's matching heuristics.)

- `authenticated` (= an admin logged in via Magic Link whose email is in
  `admin_users` with `active = true`) may **SELECT** everything; may
  **NOT** INSERT / UPDATE / DELETE. Writes always go through n8n with
  the service-role key.

  Gate `authenticated` SELECT policies with a join:
  ```sql
  using (
    exists (
      select 1 from admin_users
      where lower(admin_users.email) = lower(auth.email())
        and admin_users.active = true
    )
  )
  ```

- `service_role` (used by n8n workflows) bypasses RLS automatically.

### 0006_realtime.sql

Add the dashboard-streamed tables to the Supabase realtime publication:

```sql
alter publication supabase_realtime add table
  conversations,
  turns,
  handovers,
  safety_events;
```

Plus a comment block explaining that the dashboard's `apps/dashboard`
client subscribes to these via Supabase realtime channels in step 08.

**Dropped vs hospitals/**: migration 0007 (KPI materialised views — the
simplified dashboard computes its counters with on-the-fly queries),
0008 (visit_intake additions — folded into 0001/0002), 0009 (one_active
constraint — folded into 0005), 0010 (per-dependent labelling — out of
scope for the Dawood POC).

## Seed (`supabase/seed.sql`)

Insert Jordan-flavored demo data. Realistic Arabic Jordanian names,
`+962` phone numbers, recent dates (use today's date as the anchor for
"upcoming" rows; the prompt asker's local date is in early 2026 — use
that as the seed reference).

Wrap the entire seed in `begin; … commit;`. At the top, include a
**guarded `truncate cascade` block** that's commented out by default:

```sql
-- Uncomment to wipe data before re-seeding. DESTRUCTIVE.
-- do $$ begin
--   truncate
--     customer_feedback, outcomes, handovers, tool_calls, turns,
--     conversations, safety_events, consent_log, audit_log,
--     visit_intake, visits, patients,
--     slot_overrides, slot_templates, visit_types,
--     chief_complaint_patterns, specialties,
--     facility_holidays, facility_hours, facilities,
--     admin_users
--   restart identity cascade;
-- end $$;
```

Volumes:

- **1 facility** — Dawood Hospital. Set:
  - `code = 'dawood_main'`
  - `name_ar = 'مستشفى داوود'`, `name_en = 'Dawood Hospital'`
  - `city = 'Amman'` (or another Jordanian city — leave the
    `address_line1` / `address_line2` as `'<<ADDRESS LINE 1 — confirm
    with client>>'` placeholders with an inline SQL comment so ops
    knows to update them before going live)
  - `country = 'JO'`
  - `phone = '+96265000000'` (placeholder Jordanian landline format)
  - `services` covering the 7 specialties as text[] codes
  - Facility hours: open Sun–Thu 08:00–20:00, Fri closed, Sat
    10:00–18:00 (typical Jordanian outpatient pattern; comment that ops
    should confirm).
  - Holidays: Jordanian Independence Day (May 25), Eid al-Fitr (3 days,
    rough date placeholder), Eid al-Adha (4 days, rough date
    placeholder), Christmas Day (Dec 25 — Dawood serves all
    communities), New Year's Day. Add SQL comments noting Hijri dates
    shift each year and need annual review.

- **7 specialties** — exactly:

  | code               | name_ar                           | name_en           | color_hex |
  |--------------------|-----------------------------------|-------------------|-----------|
  | `cardiology`       | عيادة القلب                       | Cardiology        | `#dc2626` |
  | `ent`              | عيادة الأنف والأذن والحنجرة       | ENT               | `#f59e0b` |
  | `internal_medicine`| عيادة الباطنية                    | Internal Medicine | `#0891b2` |
  | `ophthalmology`    | عيادة العيون                      | Ophthalmology     | `#7c3aed` |
  | `pediatrics`       | عيادة الأطفال                     | Pediatrics        | `#ec4899` |
  | `dentistry`        | عيادة الأسنان                     | Dentistry         | `#16a34a` |
  | `dermatology`      | عيادة الجلدية                     | Dermatology       | `#0ea5e9` |

  Add `description_ar` / `description_en` of 1–2 sentences each.

- **40+ chief_complaint_patterns** — spread across all 7 specialties.
  Examples (produce ALL of these, plus enough additional patterns to
  reach 40+ rows total; aim for ~6 patterns per specialty):

  | pattern_ar                          | specialty           | weight |
  |-------------------------------------|---------------------|--------|
  | ألم في الصدر                        | cardiology          | 3      |
  | خفقان                               | cardiology          | 2      |
  | ضغط الدم مرتفع                       | cardiology          | 2      |
  | صعوبة في التنفس                      | cardiology          | 2      |
  | صعوبة في التنفس                      | internal_medicine   | 1      |
  | تورم في الساقين                      | cardiology          | 2      |
  | دوار / دوخة                          | internal_medicine   | 2      |
  | صداع                                | internal_medicine   | 2      |
  | تعب عام                              | internal_medicine   | 2      |
  | حرارة                                | internal_medicine   | 2      |
  | حرارة عند طفل                        | pediatrics          | 3      |
  | تنميل في الأطراف                     | internal_medicine   | 2      |
  | تنميل في الأطراف                     | cardiology          | 1      |
  | ألم في البطن                         | internal_medicine   | 2      |
  | إسهال                                | internal_medicine   | 2      |
  | غثيان                                | internal_medicine   | 2      |
  | ألم في الأذن                         | ent                 | 3      |
  | طنين في الأذن                        | ent                 | 3      |
  | احتقان في الأنف                      | ent                 | 2      |
  | التهاب في الحلق                      | ent                 | 2      |
  | بحة في الصوت                         | ent                 | 2      |
  | فقدان حاسة الشم                      | ent                 | 2      |
  | ضعف في النظر                         | ophthalmology       | 3      |
  | احمرار في العين                      | ophthalmology       | 3      |
  | حكة في العين                         | ophthalmology       | 2      |
  | ألم في العين                         | ophthalmology       | 2      |
  | إفرازات من العين                     | ophthalmology       | 2      |
  | فحص نظر دوري                         | ophthalmology       | 1      |
  | كحة عند طفل                          | pediatrics          | 3      |
  | إسهال عند طفل                        | pediatrics          | 3      |
  | طفح جلدي عند طفل                     | pediatrics          | 2      |
  | تطعيمات للطفل                        | pediatrics          | 3      |
  | متابعة نمو الطفل                      | pediatrics          | 2      |
  | ألم في الأسنان                        | dentistry           | 3      |
  | تنظيف أسنان                          | dentistry           | 3      |
  | تسوس                                | dentistry           | 2      |
  | نزيف اللثة                           | dentistry           | 2      |
  | تركيب أسنان                          | dentistry           | 2      |
  | فحص أسنان دوري                       | dentistry           | 1      |
  | طفح جلدي                             | dermatology         | 3      |
  | حكة في الجلد                         | dermatology         | 3      |
  | حب الشباب                            | dermatology         | 2      |
  | إكزيما                               | dermatology         | 2      |
  | تساقط الشعر                          | dermatology         | 2      |
  | تغير في لون الجلد                    | dermatology         | 2      |

  (Some complaints intentionally appear twice with different specialties
  + weights — that's the cross-routing signal `suggest_specialty` uses.
  E.g. "صعوبة في التنفس" weighs 2 for cardiology, 1 for internal medicine.)

- **8 visit_types** — minimum:
  `new_consult_general` (30 min), `follow_up_general` (15 min),
  `new_consult_pediatric` (30 min, specialty=pediatrics),
  `new_consult_cardiology` (30 min, specialty=cardiology),
  `dental_checkup` (30 min, specialty=dentistry),
  `eye_exam` (20 min, specialty=ophthalmology),
  `dermatology_consult` (20 min, specialty=dermatology),
  `ent_consult` (20 min, specialty=ent).

- **~30 slot_templates** — spread across the week (Sun–Thu mornings and
  afternoons, Sat morning) and across the 7 specialties. Roughly 4
  templates per specialty + a few general slots. Don't worry about
  perfectly realistic doctor schedules — the goal is "the
  `check_availability` tool returns non-empty results".

- **30 patients** — realistic Arabic Jordanian first + last names. Mix
  of common Jordanian phone prefixes (`+96279…`, `+96278…`, `+96277…`).
  DOBs spread from infants (for pediatrics testing — set `is_minor =
  true` with a `guardian_patient_id` link to an adult patient row) to
  elderly. Mix `language` values: ~25 `ar`, ~5 `en`. Use diverse names
  like Ahmad Al-Hassan, Fatima Al-Nimer, Khaled Khoury, Maryam Daoud,
  Omar Bashir, Layla Tabbaa, Nour Saleh, Yousef Al-Masri, Rana
  Abdullah, Bilal Atallah, Sara Haddad, etc. (no requirement that they
  be real people — these are demo records, but they should *sound*
  authentically Jordanian).

- **60 visits** — distribute:
  - **30 past** — mix of `discharged` (= completed), `cancelled`,
    `no_show`. Spread across the last 60 days.
  - **20 upcoming** — `status = 'scheduled'`, in the next 30 days,
    spread across the 7 specialties.
  - **10 today** — `status = 'scheduled'` with `scheduled_start` between
    now and end-of-today (UTC; pick reasonable Asia/Amman hours).
  - Each `visit` gets a paired `visit_intake` row with a plausible
    Arabic `chief_complaint` drawn from the patterns table, plus
    `suggested_specialty_id` populated for roughly 70% of rows and
    `picked_by` distributed (50% `patient`, 35% `bot_suggestion`, 15%
    `staff_override`).
  - Booking references format `DV-XXXXX` (5-char alphanumeric uppercase).

- **2 admin_users** — placeholder emails like
  `admin1@dawood-hospital.example` and
  `admin2@dawood-hospital.example`. Comment that ops will replace these
  with real Magic Link addresses before going live.

**Do NOT seed**: `conversations`, `turns`, `tool_calls`, `handovers`,
`outcomes`, `customer_feedback`, `audit_log`, `consent_log`,
`safety_events`. Those are produced at runtime by real calls. (Leaving
them empty makes the dashboard show "no data yet" states on first
boot — which is the truth.)

## `supabase/README.md`

Brief instructions, ~30–50 lines:

- **Prerequisites**: a Supabase project (any plan) OR a local Postgres
  with `pgcrypto` + `pg_trgm` available.
- **Apply locally with Supabase CLI**:
  ```bash
  npx supabase start
  npx supabase db reset   # runs migrations + seed
  ```
- **Apply to a hosted Supabase project**:
  ```bash
  npx supabase link --project-ref <YOUR_REF>
  npx supabase db push    # pushes migrations only
  psql "$SUPABASE_DB_URL" -f supabase/seed.sql   # seed separately
  ```
- **Apply manually against any Postgres**:
  ```bash
  for f in supabase/migrations/*.sql; do
    echo "Applying $f..."
    psql "$DB_URL" -f "$f"
  done
  psql "$DB_URL" -f supabase/seed.sql
  ```
- **Re-seed without wiping schema**: edit `seed.sql` to uncomment the
  `truncate cascade` guard block at the top, then re-run.
- **A note on Jordanian holidays**: the seeded holidays mix Gregorian
  fixed dates with Hijri-shifting Eid dates. Ops must review and update
  `facility_holidays` annually.

## Execution discipline

- Produce all 8 files (`6 migrations + seed.sql + README.md`) **one at
  a time**, smallest to largest, with a one-line checkpoint between each
  (e.g. "0001 written — 8 tables, 2 extensions").
- After the last file, print a summary table:
  - Tables created (grouped by migration)
  - Seed row counts (1 facility, 7 specialties, 40+ patterns, 30
    patients, 60 visits, etc.)
  - Any constraint or assumption you want the human to revisit (e.g.
    "I guessed Sun–Thu opening hours; please confirm with Dawood ops").
- Do **NOT** run `supabase start`, `supabase db reset`, or `psql`
  yourself — the human will run those locally.
- Do **NOT** install any new npm packages or modify files outside
  `supabase/`.
- If any SQL produces a syntax you're unsure about (rare functions,
  edge-case CHECK constraints), explain the choice in a SQL comment
  rather than silently skipping it.

## Report back

When done, print:

1. The 8 files produced (paths + line counts).
2. The summary table of tables + seed counts.
3. Any flagged constraints / assumptions for human review.
4. The verification command block (below) for the human to run.

## Verification (the human will run)

```bash
# Option A: with Supabase CLI installed locally
cd <project>
npx supabase start
npx supabase db reset

# Option B: manual against a remote Postgres URL
export DB_URL="postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres"
for f in supabase/migrations/*.sql; do
  echo "Applying $f..."
  psql "$DB_URL" -f "$f"
done
psql "$DB_URL" -f supabase/seed.sql

# Spot checks — expected counts
psql "$DB_URL" -c "select count(*) from public.facilities;"               # expect 1
psql "$DB_URL" -c "select count(*) from public.specialties;"              # expect 7
psql "$DB_URL" -c "select count(*) from public.chief_complaint_patterns;" # expect 40+
psql "$DB_URL" -c "select count(*) from public.patients;"                 # expect 30
psql "$DB_URL" -c "select count(*) from public.visits;"                   # expect 60
psql "$DB_URL" -c "select count(*) from public.visit_intake;"             # expect 60

# Extensions installed
psql "$DB_URL" -c "\dx"   # expect pgcrypto AND pg_trgm

# Table inventory
psql "$DB_URL" -c "\dt+"  # ~17 tables expected

# Verify the trigram index on patterns
psql "$DB_URL" -c "\d+ chief_complaint_patterns"
# Should show the GIN index on pattern_ar using gin_trgm_ops

# Smoke-test suggest_specialty's matching primitive:
psql "$DB_URL" -c "
  select s.code, p.pattern_ar, similarity(p.pattern_ar, 'عندي وجع شديد في الصدر') as score, p.weight
    from chief_complaint_patterns p
    join specialties s on s.id = p.specialty_id
   where p.pattern_ar % 'وجع شديد في الصدر'
   order by score desc, p.weight desc
   limit 5;
"
# Expect 'ألم في الصدر' → cardiology near the top (pg_trgm handles
# 'وجع'/'ألم' synonymy poorly but matches 'الصدر'); the suggest_specialty
# n8n workflow in step 06 layers extra logic on top of this primitive.
```

## STOP

Stop here. Wait for me to paste `04_knowledge_base.md`.
