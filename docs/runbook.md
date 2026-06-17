# Operations Runbook — مستشفى داوود Voice Assistant (Salma)

Operational guide for the Dawood Hospital Arabic voice assistant. Single
facility, Jordan jurisdiction (Asia/Amman, +962). The agent persona is
**سلمى (Salma)**.

> Naming note: this runbook uses the **real** artifact names. Where the
> step-09 spec used placeholders that don't match what was built, the real
> name is used and flagged: webhook paths are hyphenated (`book-visit`), the
> telemetry table is `conversations` (not `calls`), the facility table is
> `facilities` (not `facility`), and booking references are `DV-XXXXX`.

---

## 1. Local dev

```bash
npm install
npm run dev:call        # call app  → http://localhost:3020
npm run dev:dashboard   # dashboard → http://localhost:3021
```

Root `package.json` exposes workspace-aware scripts: `dev:call`,
`dev:dashboard`, `build:call`, `build:dashboard`, `typecheck`, `lint`.
Each app loads its own `apps/<app>/.env.local`. The full credential set for
scripts lives in the gitignored root `.env.local`.

## 2. Supabase setup (Jordan-aware)

1. Create a Supabase project in **EU-Frankfurt** (closest standard region
   with low latency to Jordan and a documented availability story; revisit
   when Supabase adds a Levant region). Data-residency wording → see
   `docs/compliance.md`.
2. Apply migrations: `node scripts/apply_migration.mjs` (target via
   `DATABASE_URL` / `SUPABASE_DB_URL` / `--target`). Runs the six SQL files
   in `supabase/migrations/` idempotently.
3. Load the seed: run `supabase/seed.sql` (Supabase SQL editor, or
   `psql "$SUPABASE_DB_URL" -f supabase/seed.sql`).
4. Run the `suggest_specialty_score(...)` SQL function from
   `n8n/README.md` (required by the `suggest_specialty` workflow).
5. Verify: `select count(*) from public.specialties;` → **7**.
   Single-facility check: `select count(*) from public.facilities;` → **1**.

## 3. n8n setup

Host n8n (Docker or n8n.cloud) in the same region as Supabase. Set the env
vars in §5, then push the workflows:

```bash
node scripts/deploy_n8n.mjs            # dry run — prints create/update plan
node scripts/deploy_n8n.mjs --apply    # push + activate all 12
```

Twelve workflows: ten agent tools + two telemetry (`log_conversation_turn`,
`post_call_finalize`). Generate an n8n admin API key for the deploy script
(`X-N8N-API-KEY`). See `docs/n8n_setup.md` for the manual import path + curl
smoke test.

## 4. ElevenLabs setup

Create the Salma agent, then:

```bash
node scripts/deploy_elevenlabs.mjs --apply   # push prompt + 17 KB + 10 tools + settings
```

Audition an Arabic voice and write its id into `elevenlabs/agent_settings.md`
(the `voice_id` slot is a placeholder until you do). Details in
`docs/elevenlabs_setup.md`.

## 5. Env vars

| Var | call (3020) | dashboard (3021) | n8n | scripts |
|---|:---:|:---:|:---:|:---:|
| `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` | ✅ | | | |
| `NEXT_PUBLIC_SUPABASE_URL` | | ✅ | | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | | ✅ | | |
| `SUPABASE_SERVICE_ROLE_KEY` 🔒 | | ✅ | ✅ | ✅ |
| `SUPABASE_URL` (alias for scripts) 🔒 | | | ✅ | ✅ |
| `SUPABASE_DB_URL` / `DATABASE_URL` 🔒 | | | | ✅ |
| `ELEVENLABS_API_KEY` 🔒 | | | | ✅ |
| `ELEVENLABS_AGENT_ID` | | | | ✅ |
| `N8N_BASE_URL` | | | | ✅ |
| `N8N_API_KEY` 🔒 | | | | ✅ |
| `N8N_SHARED_SECRET` 🔒 | | | ✅ | ✅ |
| `DEFAULT_TIMEZONE=Asia/Amman` | ✅ | ✅ | ✅ | ✅ |
| `JURISDICTION=JO` | ✅ | ✅ | ✅ | |

🔒 = **never commit**. These live only in gitignored `.env.local` files. Rotate
if a transcript/export ever leaks them.

## 6. Smoke tests

```bash
node scripts/verify_booking.mjs   # expects steps 1–7 PASS (step 8 optional)
```

Then place a real call in `apps/call` (3020) and watch the dashboard
overview tiles move in realtime. Walk the five dashboard pages and confirm
counts move when a test call lands. (Telemetry tables are unseeded, so
`/calls`, `/handovers`, and overview KPIs read zero/empty until live calls
flow.)

## 7. Daily ops

- **Safety events** are written to `safety_events` for audit but are **not**
  shown in the dashboard (by design). Query them directly when needed.
- **Handover queue**: the `/handovers` page — filter by reason / status,
  open a row for the full `customer_data` and a link to the source call.
- **Redeploy after a system-prompt edit**: re-run
  `node scripts/deploy_elevenlabs.mjs --apply`.
- **Add a chief-complaint pattern** (no redeploy):
  `insert into public.chief_complaint_patterns (pattern_ar, specialty_id, weight) values ('ضيق نفس', '<cardiology id>', 3);`
  See `docs/specialty_triage_design.md`.

## 8. Handover contract (folded in)

The agent ↔ human transfer protocol.

- **Two steps:** the agent calls the **`prepare_handover`** tool (logs a row
  to `public.handovers` via n8n, returns a `target_agent_id` = the human
  queue destination), then the ElevenLabs system tool **`transfer_to_agent`**
  routes the live call. There is no second "Hayat" agent — transfer goes
  straight to the human queue.
- **Reason codes** — the DB-allowed set (`handovers.reason_code` CHECK, the
  authoritative list; the step-09 spec's `caller_declined_recording` /
  `language_not_supported` / etc. are **not** used):
  - `consent_declined` — caller refused call recording.
  - `out_of_scope` — request outside the assistant's remit (e.g. clinical/medical advice).
  - `customer_request` — caller explicitly asked for a human.
  - `low_confidence` — the assistant is not confident it understood.
  - `repeated_failure` — the same step failed repeatedly.
  - `patient_not_found` — identity could not be resolved.
  - `safety` — a safety/guardrail escalation (auto-escalated from a critical safety event).
  - `specialty_unclear` — triage could not match a clinic and the caller couldn't name one.
- **Summary (`summary_ar`)** — Arabic, 1–3 sentences: **what** the caller
  wanted / **why** the assistant stopped / **where** it got stuck.
- **`customer_data` JSON** — `{ phone, patient_id (if known), language,
  last_suggested_specialty (if any), last_visit_id (if relevant) }`.
- **Post-handover policy** — no CES question, no re-engagement, no callback
  unless the caller asks.

## 9. Incident response

- **n8n workflow failing** — check (a) `X-Auth-Secret` matches
  `N8N_SHARED_SECRET` on both sides, (b) Supabase reachable + service-role
  key valid, (c) no `{{PLACEHOLDER}}` left in an env var (the workflows
  reject placeholder-looking values). Re-run a single tool with the curl in
  `docs/n8n_setup.md`.
- **Supabase down** — the dashboard shows stale data; live calls still run,
  but telemetry/booking writes fail at the n8n layer (the agent surfaces a
  graceful Arabic error and may hand over). Recovery: confirm the project is
  up, re-run `verify_booking.mjs`.
- **ElevenLabs latency spike** — audition + switch to a backup Arabic voice
  in `agent_settings.md` and redeploy; confirm the agent region. Connection
  type stays `websocket` (WebRTC has known ICE-timeout issues behind
  enterprise NAT).
