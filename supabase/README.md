# Dawood Hospital — Supabase schema

Six SQL migrations + a Jordan-flavored seed. Postgres is the single source
of truth for the Dawood voicebot (patients, visits, triage data, telemetry,
governance). Times are stored UTC; the app renders them in `Asia/Amman`.

```
supabase/
├── migrations/
│   ├── 0001_reference.sql   facility, hours, holidays, specialties (7),
│   │                        chief_complaint_patterns (+pg_trgm), visit_types,
│   │                        slot_templates, slot_overrides
│   ├── 0002_operational.sql patients, visits, visit_intake
│   ├── 0003_telemetry.sql   conversations, turns, tool_calls, handovers,
│   │                        outcomes, customer_feedback
│   ├── 0004_governance.sql  audit_log (append-only), consent_log,
│   │                        safety_events, admin_users
│   ├── 0005_indexes_and_rls.sql  hot-path indexes, one-active-visit
│   │                        constraint, RLS on all 21 tables
│   └── 0006_realtime.sql    realtime publication (conversations, turns,
│                            handovers, safety_events)
├── seed.sql
└── README.md
```

## Prerequisites

- A Supabase project (any plan), **or** a local Postgres with the
  `pgcrypto` and `pg_trgm` extensions available.
- The RLS policies reference Supabase-only objects (`auth.email()`, the
  `anon` / `authenticated` / `service_role` roles) and `0006` targets the
  `supabase_realtime` publication. On a vanilla Postgres those policies will
  error / the realtime step self-skips — apply against Supabase for a true run.

## Apply locally with the Supabase CLI

```bash
# If this folder isn't a Supabase project yet, run `npx supabase init` once
# (it writes supabase/config.toml) before the commands below.
npx supabase start
npx supabase db reset    # runs all migrations + seed.sql
```

## Apply to a hosted Supabase project

```bash
npx supabase link --project-ref <YOUR_REF>
npx supabase db push                              # migrations only
psql "$SUPABASE_DB_URL" -f supabase/seed.sql      # seed separately
```

## Apply manually against any Postgres

```bash
for f in supabase/migrations/*.sql; do
  echo "Applying $f..."
  psql "$DB_URL" -f "$f"
done
psql "$DB_URL" -f supabase/seed.sql
```

## Re-seeding

`seed.sql` is anchored on `now()` (today's visits stay "today") and every
insert is guarded (`on conflict do nothing` / `not exists`), so re-running it
is a no-op. For a **clean** re-seed, uncomment the `truncate ... cascade`
block at the top of `seed.sql` (DESTRUCTIVE) and re-run.

## Notes for ops

- **Address**: `facilities.address_line1/2` are `<<…confirm with client>>`
  placeholders — update before go-live.
- **Hours**: seeded Sun–Thu 08:00–20:00, Fri closed, Sat 10:00–18:00 — confirm
  with Dawood.
- **Holidays**: `facility_holidays` mixes fixed Gregorian dates with
  **approximate** Hijri-shifting Eid dates. Review and update annually.
- **chief_complaint_patterns** is an editable triage lookup — ops can tune
  routing by inserting/updating/deleting rows here, no code deploy needed.
- **admin_users** holds 2 placeholder emails; replace with real Magic Link
  addresses before granting dashboard access.
