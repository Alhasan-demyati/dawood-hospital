<!-- Dawood Hospital simplification of hospitals/09_scripts_docs_and_qa.md
     drops: docs/telephony.md (out of scope), docs/handover_contract.md
            (folded into runbook.md), separate verify_handover.mjs (folded into
            verify_booking.mjs), test dialogues for UC-H3/H4/H5/H6 (those UCs
            don't exist in this pack), KPI views (we use count queries instead)
     adds: docs/specialty_triage_design.md (explains suggest_specialty + how to
           tune pattern weights), single combined verify_booking.mjs for the
           full UC-D2 happy path -->

# STEP 09 — Scripts, docs, and QA harness

> Prerequisites: steps 01–08 complete. The Dawood Hospital clone now has the
> monorepo scaffold, six SQL migrations + Jordan seed, the seventeen Arabic KB
> articles, the ElevenLabs agent config (system prompt + tool schemas + agent
> settings + safety guardrails + webhook events), the twelve n8n workflows
> (ten agent tools + two telemetry), the call app on port 3018, and the five-
> page dashboard on port 3019.
>
> Scope of THIS prompt: produce the operational scripts, the docs, and the
> manual QA harness. After this step the clone is complete and ready to
> deploy. **No code changes to apps/, packages/, supabase/, elevenlabs/, or
> n8n/ in this step** — only new files under `scripts/` and `docs/`.

## What to produce

```
scripts/
├── _deploy_lib.mjs                  (shared helpers for deploy scripts)
├── _deploy_el_tools.mjs             (ElevenLabs-specific helpers)
├── deploy_elevenlabs.mjs            (push system prompt + KB + tool schemas)
├── deploy_n8n.mjs                   (push all 12 workflows to n8n)
├── apply_migration.mjs              (idempotent migration runner)
├── verify_booking.mjs               (E2E UC-D2 happy path, single script)
└── delete_patient_data.mjs          (Jordan PDP / right-to-erasure flow)

docs/
├── runbook.md                       (operational guide; folds handover contract)
├── kpi_definitions.md               (count-based KPIs, no views)
├── elevenlabs_setup.md              (agent + KB + tools + voice ID auditioning)
├── n8n_setup.md                     (workflow import, env vars, smoke test)
├── compliance.md                    (Jordan MoH framing; REVIEW WITH LEGAL tags)
└── specialty_triage_design.md       (how suggest_specialty works + tuning)

elevenlabs/test_dialogues/
├── UC-D1_faq.md                     (3 sample dialogues, Arabic)
├── UC-D2_booking_with_triage.md     (3 dialogues: high conf, ambiguous, override)
└── UC-D3_reschedule_cancel.md       (3 dialogues: reschedule, cancel, status)
```

That is **7 scripts, 6 docs, and 3 test-dialogue files**. Nothing else.

## Scripts — specifications

Order of authoring: produce `_deploy_lib.mjs` first (everything else imports
from it), then `_deploy_el_tools.mjs`, then the four deploy/migration
scripts, then `verify_booking.mjs`, then `delete_patient_data.mjs`.

All scripts:

- `#!/usr/bin/env node` shebang
- ESM `import` syntax (the files are `.mjs`)
- Load env from `apps/dashboard/.env.local` by default (the dashboard env
  is the most complete one in this pack)
- Print timestamped log lines
- Exit code `0` on success, non-zero on any failure
- Never silently swallow an HTTP error — always surface the body

### `scripts/_deploy_lib.mjs`

Reusable helpers used by every other script:

```js
export async function loadEnv(envPath = "apps/dashboard/.env.local") { … }
export async function httpJson(url, opts = {}) { … }   // fetch + JSON, throws on !ok
export function log(...args) { … }                      // ISO timestamp prefix
export function panic(msg, code = 1) { … }
export function readFileSafe(path) { … }                // returns "" if missing
export function diffStrings(a, b) { … }                 // tiny line-diff for dry-run output
```

### `scripts/_deploy_el_tools.mjs`

ElevenLabs-specific helpers. Auth header on every call:
`xi-api-key: $ELEVENLABS_API_KEY`. Base URL: `https://api.elevenlabs.io`.

```js
export async function elGet(path) { … }
export async function elPost(path, body) { … }
export async function elPatch(path, body) { … }
export async function uploadKBDocument(filePath) { … }       // multipart upload
export async function setAgentSystemPrompt(agentId, text) { … }
export async function syncTools(agentId, schemas) { … }       // diff + add/update/remove
```

### `scripts/deploy_elevenlabs.mjs`

```bash
node scripts/deploy_elevenlabs.mjs              # dry run, prints plan
node scripts/deploy_elevenlabs.mjs --apply      # actually pushes
```

What it does:

1. Reads `elevenlabs/system_prompt.md`. Diffs against the agent's current
   system prompt (via `GET /v1/convai/agents/:id`). Queues an update if
   they differ.
2. Reads `elevenlabs/tool_schemas.json`. Diffs against the agent's current
   tool definitions. Queues add / update / remove operations to match.
3. Reads every `elevenlabs/kb/*.md`. Lists current KB documents on the
   agent. For each local file: if not present remotely → queue upload; if
   present but contents differ → queue replace.
4. Reads the structured fields out of `elevenlabs/agent_settings.md`
   (voice_id, temperature, max_tokens, asr_model, language) and queues any
   that differ.
5. Prints the queued plan as a numbered list.
6. With `--apply`: executes the plan against the ElevenLabs API one
   operation at a time, with a one-line success log per operation.

Reads from env: `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`.

### `scripts/deploy_n8n.mjs`

```bash
node scripts/deploy_n8n.mjs                     # dry run
node scripts/deploy_n8n.mjs --apply
```

What it does:

1. Reads every `n8n/workflows/*.json` (twelve files total — ten tools + two
   telemetry).
2. Calls `GET $N8N_BASE_URL/api/v1/workflows` to list existing workflows.
3. For each local file: if a workflow with the same `name` exists → queue
   update (`PUT /api/v1/workflows/:id`); otherwise → queue create
   (`POST /api/v1/workflows`).
4. With `--apply`: executes operations in order. After each create / update,
   activates the workflow (`POST /api/v1/workflows/:id/activate`).
5. Prints a final state summary: total active, last-updated timestamps.

Reads from env: `N8N_BASE_URL`, `N8N_API_KEY`.

Auth header: `X-N8N-API-KEY: $N8N_API_KEY`.

### `scripts/apply_migration.mjs`

```bash
node scripts/apply_migration.mjs                          # apply all pending
node scripts/apply_migration.mjs --from 0003 --to 0005    # range
node scripts/apply_migration.mjs --target $DATABASE_URL   # override target
```

What it does:

1. Connects to the target Postgres (`DATABASE_URL` env var, or `--target`).
2. Ensures a `_migrations(filename text primary key, applied_at timestamptz)`
   tracking table exists.
3. Reads `supabase/migrations/*.sql` sorted ascending.
4. For each: if its filename is not in `_migrations`, run the SQL inside a
   transaction; on success, insert into `_migrations`.
5. Prints PASS / FAIL per file, exits non-zero on any failure.
6. Idempotent — re-runs are no-ops.

### `scripts/verify_booking.mjs`

The single combined E2E happy-path harness for UC-D2 (plus the UC-D3
follow-up steps).

```bash
node scripts/verify_booking.mjs
```

Calls each tool against `$N8N_BASE_URL` with the `X-Auth-Secret`
header = `$N8N_SHARED_SECRET`. Sequence:

1. `get_patient_by_phone` with a known seed phone (Jordanian +962 mobile
   from `supabase/seed.sql`). Assert `ok=true` and patient row returned.
2. `suggest_specialty` with a sample chief complaint
   (e.g. `"عندي ألم في الصدر منذ يومين"`). Assert at least one specialty
   returned with `confidence >= 0.5`.
3. `check_availability` for the suggested specialty over the next 14 days.
   Assert at least one slot returned. Pick the first.
4. `book_visit` with the picked slot + `confirmation_token =
   "confirmed_" + new Date().toISOString()`. Assert returned
   `booking_reference` matches `^DAW-\d{6}$`.
5. `list_visits` for the same patient. Assert the new booking appears
   with status `scheduled`.
6. `reschedule_visit` to the second-available slot. Assert status stays
   `scheduled` and the visit's slot timestamp changed.
7. `cancel_visit` on the same visit. Assert status becomes `cancelled`.
8. (Optional sanity) `prepare_handover` with reason_code = `out_of_scope`
   and a one-sentence Arabic summary. Assert `handover_id` returned.

Print PASS / FAIL per step. Exit code 0 if all eight pass, otherwise 1.

No separate `verify_handover.mjs` — step 8 above covers it.

### `scripts/delete_patient_data.mjs`

Jordan PDP right-to-erasure flow. Always dry-run by default.

```bash
node scripts/delete_patient_data.mjs --phone "+962790000000"             # dry
node scripts/delete_patient_data.mjs --phone "+962790000000" --apply
```

What it does:

1. Normalises the phone (E.164, +962).
2. Resolves phone → `patients.id` via the service-role Supabase client.
   If not found, exit 0 with a clear message.
3. Counts rows that will be touched across:
   `visits`, `visit_intake`, `calls`, `conversations`, `turns`,
   `tool_calls`, `handovers`, `outcomes`, `customer_feedback`,
   `consent_log`.
4. Prints the row counts per table as the dry-run plan.
5. With `--apply`: prompts the operator interactively
   (`Type DELETE to confirm:`). On confirmation:
   - Deletes the `patients` row — cascading FKs handle child rows where
     configured.
   - Anonymises orphan `conversations.caller_phone` to `NULL` for any
     conversations whose patient was deleted but the conversation row is
     retention-protected.
   - Inserts an `audit_log` row recording the erasure request with the
     operator email (from env), the phone, and the per-table counts.
6. **Never** deletes `audit_log` rows — retention is regulatory; rows are
   anonymised (set `actor_email = '[erased]'`) instead.

## Docs — specifications

Order: produce these after all scripts compile. Each doc is pure Markdown,
no Mermaid required (plain prose is the default; a tiny ASCII diagram is
fine if it actually helps).

### `docs/runbook.md`

The operational guide. Sections, in order:

1. **Local dev** — `npm install`, `npm run dev:call` (3018),
   `npm run dev:dashboard` (3019). Note the workspace-aware scripts in
   the root `package.json`.
2. **Supabase setup (Jordan-aware)** — create a project in
   **EU-Frankfurt** (closest standard region with low latency to Jordan
   and a documented availability story; revisit when Supabase adds a
   Jordan / Levant region). Run `node scripts/apply_migration.mjs`. Run
   the seed. Verify `select count(*) from specialties` returns `7`.
   Single-facility: confirm `select count(*) from facility` returns `1`.
3. **n8n setup** — host n8n (Docker or n8n.cloud), set the env vars
   listed below, import the twelve workflows via the dashboard or via
   `node scripts/deploy_n8n.mjs --apply`, activate each. Generate an
   admin API key for the deploy script.
4. **ElevenLabs setup** — create the Salma agent, run
   `node scripts/deploy_elevenlabs.mjs --apply` to push the system
   prompt + 17 KB articles + 10 tool schemas + settings. Audition an
   Arabic voice (see `elevenlabs_setup.md`).
5. **Env vars** — table of every env var across the three runtimes
   (`apps/call`, `apps/dashboard`, `n8n`, `scripts/`) and what goes
   where. Mark service-role variables as **never** committed.
6. **Smoke tests** — `node scripts/verify_booking.mjs` end-to-end.
   Expected output: 8 × PASS. Manually click through the dashboard's
   five pages and verify counts move when a test call is placed.
7. **Daily ops** — where to look in the dashboard for safety events,
   how to read the handover queue, how to redeploy after a system
   prompt edit (re-run `deploy_elevenlabs.mjs --apply`), how to add a
   new chief-complaint pattern (SQL insert into
   `chief_complaint_patterns`; no redeploy needed).
8. **Handover contract (folded in)** — the agent ↔ human transfer
   protocol:
   - The two-step handover: agent calls `prepare_handover` (logs to
     Supabase, returns a `target_agent_id`), then ElevenLabs system
     tool `transfer_to_agent` routes the live call.
   - The reason codes: `out_of_scope`, `caller_declined_recording`,
     `language_not_supported`, `identification_failed`,
     `clinical_question`, `complaint`, `other`. Each gets a one-sentence
     definition.
   - Summary requirements: Arabic, 1–3 sentences, says **what** the
     caller wanted / **why** the agent stopped / **where** the
     conversation got stuck.
   - `customer_data` JSON shape (phone, patient_id if known, language,
     last suggested specialty, last visit ID if relevant).
   - Post-handover policy: no CES question, no re-engagement, no
     callback unless the caller asks.
9. **Incident response** — common failure modes and recovery:
   - n8n workflow failing (`X-Auth-Secret` mismatch, Supabase
     unreachable, placeholder leak).
   - Supabase down (dashboard shows stale; calls still run but writes
     queue; manual recovery steps).
   - ElevenLabs latency spike (switch to backup voice; check region).

### `docs/kpi_definitions.md`

Define every KPI shown on the overview page. Per KPI:

- Name (Arabic + English)
- Source: the count query (this pack does **not** use materialized KPI
  views — overview tiles run small `count(*)` / `avg()` queries directly
  against the operational tables).
- Formula in plain SQL-ish prose.
- Refresh: realtime (Supabase Realtime channel) or on-page-load.
- Interpretation: "good if above X; investigate if below Y."

Cover:

| KPI | Source |
|-----|--------|
| Calls today | `count(*) from calls where started_at::date = current_date` |
| Containment rate | `count where outcome ∈ ('resolved','book_visit_success','cancel_visit_success','reschedule_success') / count(*)` |
| Average Handling Time (AHT) | `avg(extract(epoch from (ended_at - started_at))) from calls today` |
| Customer Effort Score (CES) avg | `avg(score) from customer_feedback today` |
| Handover rate | `count(*) from handovers today / count(*) from calls today` |
| No-show rate | `count where status='no_show' / count where status in ('completed','no_show') over last 30 days` |
| Specialty distribution | `count(*) from visits group by specialty_id` |

### `docs/elevenlabs_setup.md`

ElevenLabs agent setup, end-to-end. Sections:

1. Account + project (EU region) + API key.
2. Create the Salma agent in the ElevenLabs console.
3. Audition Arabic voices: list 3–4 candidates the operator should
   compare (warm female adult, MSA-comprehensible across the Levant).
   Pick one, write the voice ID into `elevenlabs/agent_settings.md`.
4. Run `node scripts/deploy_elevenlabs.mjs --apply` to push the
   system prompt, the seventeen KB articles, the ten tool schemas, and
   the agent settings.
5. Wire the **outbound webhooks** (`log_conversation_turn`,
   `post_call_finalize`) to the n8n endpoints from
   `elevenlabs/webhook_events.md`.
6. Test in the ElevenLabs console: paste sample dialogues from
   `elevenlabs/test_dialogues/UC-D1_faq.md`.
7. Save the agent ID into `apps/call/.env.local` as
   `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`.

### `docs/n8n_setup.md`

n8n setup, end-to-end. Sections:

1. Host n8n (Docker compose snippet, or n8n.cloud) in the same region as
   Supabase.
2. Set env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `N8N_SHARED_SECRET`, `DEFAULT_TIMEZONE=Asia/Amman`, `JURISDICTION=JO`.
3. Import the twelve workflows via `node scripts/deploy_n8n.mjs --apply`
   (or import the JSONs manually one-by-one).
4. Activate each workflow.
5. Generate an admin API key for `deploy_n8n.mjs`.
6. Smoke test with `curl`:

   ```bash
   curl -X POST "$N8N_BASE_URL/webhook/suggest_specialty" \
     -H "X-Auth-Secret: $N8N_SHARED_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"chief_complaint":"عندي ألم في الصدر"}'
   ```

   Expected: `{ "ok": true, "data": { "suggestions": [...] }, ... }`.

### `docs/compliance.md`

(**⚠ REVIEW WITH LEGAL — Jordan MoH and a Jordanian data-protection
attorney must sign off every section below.**)

Mark every section header with an HTML comment `<!-- REVIEW WITH LEGAL -->`
so a `grep` finds them all.

Sections:

- **Regulatory regime** <!-- REVIEW WITH LEGAL --> — Jordan Ministry of
  Health operational expectations around outpatient appointment handling
  and call recording; the Jordan Personal Data Protection Law (PDP)
  framing (the actual gazetted text and effective date must be confirmed
  by counsel).
- **Data residency** <!-- REVIEW WITH LEGAL --> — Supabase project in
  EU-Frankfurt; ElevenLabs EU region; n8n self-hosted in the same
  region. Cross-border processing language to be confirmed.
- **Consent capture** <!-- REVIEW WITH LEGAL --> — Recording-consent
  question at call start: "هل تسمحون بتسجيل المكالمة لأغراض جودة
  الخدمة والتدريب؟". Logged per conversation in `consent_log`. A "لا"
  triggers an immediate handover to the human queue with reason_code
  `caller_declined_recording`.
- **Identification & PII rules** <!-- REVIEW WITH LEGAL --> — Phone is
  the primary key, confirmed digit-by-digit before any record lookup.
  Jordanian national ID is **never** read aloud in full. MRN is spelled
  letter-by-letter, never bulk-read. Diagnosis, dosing, and medication
  advice are out of scope.
- **Retention windows** <!-- REVIEW WITH LEGAL --> — call recordings 12
  months, transcripts 24 months, audit log 7 years (immutable,
  append-only via trigger). Final numbers per Jordan MoH guidance.
- **Access control** <!-- REVIEW WITH LEGAL --> — Magic-Link auth,
  `admin_users` allowlist, service-role secrecy. Dashboard PII reads
  go through server actions or RLS-protected queries; the anon client
  never sees PII.
- **Audit** <!-- REVIEW WITH LEGAL --> — `audit_log` immutable; every
  write tool produces one row. Deletions to `audit_log` are blocked by
  RLS.
- **Data subject rights** <!-- REVIEW WITH LEGAL --> — Erasure via
  `scripts/delete_patient_data.mjs`; `audit_log` is anonymised, not
  deleted.
- **Open items for legal review** <!-- REVIEW WITH LEGAL --> — checklist
  with explicit unknowns: (a) confirm Jordan PDP applicability and
  notification windows, (b) confirm acceptable region(s) for hosting
  patient data, (c) confirm recording-consent script wording, (d)
  confirm retention windows per Jordan MoH, (e) confirm the handover
  warm-transfer language complies with consent transfer rules.

### `docs/specialty_triage_design.md`

NEW doc — explains the Dawood-specific specialty triage feature so
operations can tune it without redeploying.

Sections:

1. **What it does** — converts a free-text Arabic chief complaint into
   one or two recommended specialty clinics, with a confidence score.
2. **The data model** — `chief_complaint_patterns(id, pattern, weight,
   specialty_id, notes)`. Seeded with ~40 Arabic patterns covering the
   seven clinics. The `pattern` is a phrase / keyword (not a regex).
3. **How `suggest_specialty` scores** — for each chief complaint:
   - Trigram similarity (`pg_trgm`) of `pattern` against the complaint.
   - Multiplied by the pattern's `weight` (1.0 default; raise to 1.5
     for very strong indicators, lower to 0.5 for noisy ones).
   - Group by specialty, take the sum.
   - Return top 1–2 specialties with a normalised confidence in [0, 1].
4. **Confidence thresholds** the agent uses:
   - `>= 0.7` → propose one specialty.
   - `0.4–0.7` → offer top two as a choice.
   - `< 0.4` → ask the caller to pick from the seven directly.
5. **How to tune** — SQL only, no redeploy:
   - Add a pattern: `insert into chief_complaint_patterns (pattern,
     specialty_id, weight) values ('ضيق نفس', <cardiology id>, 1.3);`.
   - Adjust a weight: `update chief_complaint_patterns set weight=1.5
     where pattern='ألم في الصدر';`.
   - Remove a noisy pattern: `delete from chief_complaint_patterns
     where id=...;`.
6. **When triage fails** — three escalation paths:
   - **Empty suggestion set** → fall back to caller picking from the
     seven clinics directly. Log the complaint to
     `safety_events(kind='triage_no_match')` so ops can review.
   - **Persistent low confidence across a corpus of recent calls** →
     review the `safety_events` table monthly; add patterns.
   - **Caller frustration** (two failed turns) → `prepare_handover`
     with reason_code = `triage_failed`.
7. **Clinical review** — a Dawood physician should review the seed
   pattern set quarterly. Patterns are clinical content, not engineering
   content.

## Test dialogues — specifications

Three files under `elevenlabs/test_dialogues/`. Each file contains
**three** dialogues — turn-by-turn Arabic conversations between
CALLER and AGENT (Salma). Use formal "أنتم". Annotate each AGENT turn
that triggers a tool with a `// → calls TOOL(args)` comment.

### `elevenlabs/test_dialogues/UC-D1_faq.md`

Three FAQ scripts, each a different topic:

1. **Visiting hours + parking** — caller asks two questions in one turn,
   agent answers each in one sentence, asks "هل أستطيع مساعدتكم بشيء
   آخر؟", caller says no, CES, goodbye.
2. **Insurance partners** — caller asks "هل تقبلون تأمين [شركة]؟",
   agent answers from KB; if the named insurer is not in the partner
   list, agent says so directly and offers cash / other options.
3. **Specialties offered** — caller asks "ما هي العيادات المتوفرة عندكم؟",
   agent lists the seven specialties briefly, offers to help book.

### `elevenlabs/test_dialogues/UC-D2_booking_with_triage.md`

Three booking scripts that cover the triage decision space:

1. **High-confidence path** — caller describes chest pain
   ("عندي ألم في الصدر وضيق نفس"), `suggest_specialty` returns
   cardiology with confidence > 0.7, agent proposes it, caller agrees,
   booking confirmed.
2. **Ambiguous path** — caller describes a vague complaint
   ("عندي تعب وصداع متواصل"), `suggest_specialty` returns internal
   medicine and ENT with similar confidence (0.5 each), agent offers
   both, caller picks internal medicine.
3. **Caller-override path** — caller volunteers a specialty up front
   ("أريد حجز عيادة أطفال لابني")  — agent skips `suggest_specialty`
   and goes straight to availability for pediatrics. (Or: agent calls
   it for logging but does NOT use the result.)

Every booking dialogue ends with a confirmation gate ("هل أنتم
متأكدون؟ → نعم"), the `book_visit` tool call with a real
`confirmation_token`, a booking reference read back letter-by-letter,
and a CES question.

### `elevenlabs/test_dialogues/UC-D3_reschedule_cancel.md`

Three scripts that exercise UC-D3:

1. **Reschedule** — caller has one upcoming visit (cardiology),
   agent reads it back, caller asks to move to next week, agent offers
   new slots, caller picks one, confirmation, `reschedule_visit`.
2. **Cancel** — caller has one upcoming visit (dermatology), caller
   asks to cancel, agent asks confirmation question, caller says "نعم",
   `cancel_visit`, agent confirms done.
3. **Status check only** — caller wants to confirm date / time of an
   existing visit (dentistry), agent reads it back, caller satisfied,
   no write tool fires, CES, goodbye.

## Execution discipline

- **Order:** scripts first, then docs, then test dialogues.
- **One file at a time** with a one-line checkpoint after each file ("✓
  scripts/deploy_n8n.mjs — 142 lines").
- **No new npm dependencies** — the scripts use only Node built-ins
  (`node:fs`, `node:fs/promises`, `node:readline`, `fetch`) plus
  `dotenv` if it was added in step 02. If you need anything else,
  surface it as a flag instead of adding it.
- **No shell-out** to psql in `apply_migration.mjs` if avoidable —
  use the `postgres` driver only if step 02 already pulled it in;
  otherwise use `pg`. Mention which you chose in the file's header
  comment.
- Use the master briefing's vocabulary throughout: مستشفى داوود,
  Salma, the seven specialties, Asia/Amman, +962, single facility, no
  multi-region / EHR / NPHIES / Malaffi references anywhere.
- **`docs/compliance.md`** — every regulatory claim must carry a
  `<!-- REVIEW WITH LEGAL -->` comment in the section header.
- **Do not** create `docs/telephony.md` or `docs/handover_contract.md` —
  telephony is out of scope; handover is folded into runbook.md.
- **Do not** create separate verify_handover.mjs — its check is the
  last step of verify_booking.mjs.

## Report back

When done, print:

1. **File tree** under `scripts/` and `docs/` and
   `elevenlabs/test_dialogues/` — exactly what was produced.
2. **Script → operation table**:

   | Script | Operation | Reads env |
   |--------|-----------|-----------|
   | _deploy_lib.mjs | shared helpers | — |
   | _deploy_el_tools.mjs | ElevenLabs API helpers | ELEVENLABS_API_KEY |
   | deploy_elevenlabs.mjs | push prompt + KB + tools | ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID |
   | deploy_n8n.mjs | push 12 workflows | N8N_BASE_URL, N8N_API_KEY |
   | apply_migration.mjs | apply pending migrations | DATABASE_URL |
   | verify_booking.mjs | UC-D2 E2E + handover sanity | N8N_BASE_URL, N8N_SHARED_SECRET |
   | delete_patient_data.mjs | Jordan PDP erasure | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY |

3. **De-duped env vars** — single flat list of every env var any script
   reads.
4. **REVIEW WITH LEGAL callouts** — exact list of section headers in
   `docs/compliance.md` that carry the comment (should be ~9).
5. **Anything you simplified** vs the spec above.

## Final verification (the human runs this)

```bash
cd <project>

# Lint + typecheck the apps and shared package
npm run typecheck
npm run lint

# Smoke-run the booking harness against a live n8n.
# (Requires deploy_n8n.mjs --apply to have been run first.)
N8N_BASE_URL=$N8N_BASE_URL N8N_SHARED_SECRET=$N8N_SHARED_SECRET \
  node scripts/verify_booking.mjs

# Confirm every doc and dialogue renders
ls -la docs/*.md elevenlabs/test_dialogues/*.md

# Sanity: spin up both apps and click through the dashboard
npm run dev:dashboard   # localhost:3019
npm run dev:call        # localhost:3018
```

Expected: typecheck + lint clean, `verify_booking.mjs` prints 8 × PASS,
every doc + dialogue lists at the expected path, both apps boot.

## FINAL SUMMARY (print this at the very end)

After everything above is done, print one final block that closes out
the entire 9-step pack. Include:

1. **Total lines of code** authored across all 9 steps (Node/TS/SQL/JSON
   together) — give a single number with a per-step breakdown table.
2. **Total Markdown lines** authored across all 9 steps (KB articles,
   docs, prompts, dialogues) — single number plus per-step breakdown.
3. **Full file inventory**, grouped by step, with line counts.
4. **Outstanding flags** (everything that needs human attention before
   real patient calls):
   - **Voice ID selection** — `elevenlabs/agent_settings.md` has a
     `voice_id` slot that must be filled after auditioning.
   - **Jordan MoH legal review** — every `<!-- REVIEW WITH LEGAL -->`
     line in `docs/compliance.md` needs counsel sign-off.
   - **Telephony deferred** — the clone uses the ElevenLabs browser
     widget; PSTN / SIP integration is a follow-up workstream and is
     intentionally not in this pack.
   - **Chief-complaint patterns clinical review** — the ~40 seeded
     patterns in `chief_complaint_patterns` should be reviewed by a
     Dawood physician before launch.
   - **Real Supabase region pick** — defaults to EU-Frankfurt; revisit
     when a regional option closer to Jordan exists or if regulator
     requires in-country hosting.
5. **Suggested next operational steps** (for the user, in this order):
   1. Provision a Supabase project (EU-Frankfurt).
   2. Run `node scripts/apply_migration.mjs` against the new database;
      run the seed.
   3. Provision an n8n instance (self-hosted in the same region).
   4. Create an ElevenLabs agent and audition a voice.
   5. Wire env vars into `apps/call/.env.local`,
      `apps/dashboard/.env.local`, n8n credentials, and `scripts/`.
   6. Run `node scripts/deploy_n8n.mjs --apply` then
      `node scripts/deploy_elevenlabs.mjs --apply`.
   7. Run `node scripts/verify_booking.mjs` end-to-end and confirm
      8 × PASS.
   8. Read `docs/runbook.md` and `docs/compliance.md` cover-to-cover.
   9. Place a real test call through `apps/call` (localhost:3018) and
      verify the dashboard's overview tiles move in realtime.

Then thank the user for following the pack end-to-end.

## STOP

This is the last step in the pack. Nothing more to do here.
