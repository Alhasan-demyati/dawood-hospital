<!-- Dawood Hospital simplification of hospitals/01_master_briefing.md
     drops: UC-H3 (lab/imaging), UC-H4 (pre-auth), UC-H5 (refills), UC-H6 (after-hours triage),
            multi-facility logic, find_nearest_facility, KSA/UAE dual-jurisdiction, NPHIES/Malaffi/Riayati/Cerner/Epic,
            mock-vs-live integration switching, second handover agent (Hayat)
     adds: specialty-triage flow with 7 clinics, Jordan-only jurisdiction (Asia/Amman, +962),
           suggest_specialty tool + chief_complaint_patterns table, single-facility model -->

# MASTER BRIEFING — Dawood Hospital Voice Assistant (read this FIRST)

> **Paste this entire document as your first message to Claude Code in a fresh,
> empty project folder.** It establishes the architecture, vocabulary,
> conventions, and build order that every subsequent prompt depends on.
> Claude must absorb this fully before any other prompt is pasted.

---

## How to respond to this briefing

You are about to help me build an Arabic-first voice assistant for **مستشفى
داوود (Dawood Hospital)** — a single hospital in Jordan with 7 specialty
clinics. After reading this briefing in full, respond with a short
acknowledgement that:

1. Names the project ("Dawood Hospital voicebot, Jordan, 7 specialty clinics")
   back to me in one sentence.
2. Lists the 8 build steps you understand are coming, in order
   (scaffold → DB → KB → agent → workflows → call → dashboard → scripts/docs).
3. Confirms you understand the **Arabic-first + RTL** mandate, the
   **single-facility** mandate, the **specialty-triage** flow (chief complaint
   → suggest_specialty tool → confirm with caller), and the
   **wait-for-next-prompt** discipline.
4. Asks NO clarifying questions yet — assume everything in this briefing
   is intentional and complete. I will paste the next prompt (`02_scaffold.md`)
   when I'm ready.

Do **NOT** start writing any code, creating any folders, or running any
commands from this briefing alone. This is context, not an instruction
to act.

---

## Optional: original reference template

If you can read files at
`/Users/alhasan/Documents/voicebot-prompt-packs/hospitals/`, that is the
full hospital prompt pack this simpler version is derived from. You may
consult it for **structure and tone** as the build proceeds — never copy
text verbatim, because that pack is multi-facility / multi-region and
this Dawood pack is single-facility / Jordan-only. If that path doesn't
exist on disk, ignore it; this pack is self-contained.

---

## A. Vertical context

**Product**: an AI voice assistant that answers inbound calls to **Dawood
Hospital (مستشفى داوود)** in Jordan. It identifies the caller, handles
four use cases end-to-end, and hands over to a human staff member for
anything outside scope. A simple operations dashboard gives hospital staff
a live view of calls, visits, and handovers.

**Persona**: the assistant introduces herself as **سلمى (Salma)** from
**مستشفى داوود**. Tone: warm, calm, concise, formal "أنتم" address,
**never** "أنت" with adult patients. Reads digit-by-digit for IDs and
dates. One idea per sentence.

**The 4 use cases (UC-D1 … UC-D4)**:

- **UC-D1 — General FAQ.** Visiting hours, location, parking, departments,
  payment methods, what to bring, insurance partners. Answered from the
  Knowledge Base. No identification needed.
- **UC-D2 — Visit booking & specialty triage.** Caller wants to book a
  new visit. Bot identifies caller by phone, captures chief complaint,
  calls `suggest_specialty` to recommend a clinic (or accepts the caller's
  own pick), checks availability, confirms, books.
- **UC-D3 — Visit reschedule, cancel, or status check.** Caller has an
  existing visit. Bot identifies, reads back current visit details, then
  reschedules / cancels / just confirms based on the caller's intent.
- **UC-D4 — Multi-intent.** Caller switches goals mid-conversation
  (e.g. starts with FAQ then books). Bot follows; carries forward facts
  already given.

UC-D1 is KB-grounded only; UC-D2 and UC-D3 are data-bearing and require
**identification + confirmation tokens** before any write tool fires.

**Jurisdiction & compliance (Jordan focus)**:

- **Jordan Ministry of Health (MoH)** — operational expectations around
  patient privacy and call recording.
- **General data-protection best practices** — consent on record, minimum
  necessary data, audit log immutability, role-based dashboard access.
- This pack uses **lightweight** compliance defaults; deep regulatory
  vetting is a separate workstream (every consent-touching file carries
  a `<!-- REVIEW WITH LEGAL -->` marker).

**Integrations** (this pack is mock-free):

- Supabase Postgres is the single source of truth for everything. No
  external EHR / HIS / payer integrations in this simplified pack.
- If Dawood later wants to connect to a real EHR (HIS), that's a follow-up
  workstream — the n8n workflow layer is the natural integration seam,
  but we don't pre-build the switching code here.

**Languages**:

- Primary: **Arabic (Modern Standard with Jordanian / Levant-comprehensible
  vocabulary)**.
- Secondary: **English**, on explicit caller request only.
- Other tongues are NOT supported — handover triggered if the caller
  switches.

---

## B. Architecture (prose diagram)

```
                ┌────────────────────────────────────────────────────┐
                │              ElevenLabs Conversational AI          │
                │                                                    │
                │   System prompt (Arabic-primary, 25–30 KB)         │
                │   Knowledge Base (17 markdown articles, Arabic)    │
                │   Voice: Arabic + English fallback                 │
                │   Mode: WebSocket (NOT WebRTC — ICE timeouts)      │
                └─────────────────────┬──────────────────────────────┘
                                      │
                          tool calls / webhooks
                                      │
                                      ▼
                ┌────────────────────────────────────────────────────┐
                │                       n8n                          │
                │                                                    │
                │   12 webhook workflows (10 tools + 2 telemetry)    │
                │   Auth header: X-Auth-Secret (shared secret)       │
                │   Each: Webhook → Auth → Code → Supabase → Respond │
                │   includes suggest_specialty for triage            │
                └─────────────────────┬──────────────────────────────┘
                                      │
                                      ▼
                ┌────────────────────────────────────────────────────┐
                │                   Supabase                         │
                │                                                    │
                │   Postgres (6 migrations) + Auth + Realtime + RLS  │
                │   Tables: patients, visits, facility (single row), │
                │           specialties (7), chief_complaint_patterns│
                │           calls, conversations, turns, tool_calls, │
                │           handovers, outcomes, ...                 │
                │   pg_trgm extension for specialty matching         │
                └─────────────────────┬──────────────────────────────┘
                                      │
              ┌────────── reads ──────┴────── writes (n8n) ──────┐
              ▼                                                  ▼
   ┌────────────────────────┐                ┌────────────────────────────┐
   │      apps/call         │                │      apps/dashboard        │
   │   port 3018, public    │                │   port 3019, internal      │
   │                        │                │                            │
   │   ElevenLabs widget    │                │   5 pages, realtime feed   │
   │   Arabic-first orb     │                │   Magic Link Auth + admin  │
   │   Dynamic vars:        │                │   overview/calls/visits/   │
   │     - current_date_info│                │   handovers/settings       │
   │     - language         │                │                            │
   │                        │                │   Reads Supabase directly. │
   └────────────────────────┘                └────────────────────────────┘
```

Three runtimes, each independently deployable. The web apps are stateless
and read from Supabase. Supabase is the system of record. n8n is the
business-logic and triage layer. ElevenLabs is the voice + LLM layer.

---

## C. Stack & conventions

- **Node.js 20+**, npm workspaces (NOT pnpm, NOT yarn).
- **TypeScript everywhere** — strict mode on. No `any` unless escape-hatched
  with a comment.
- **Next.js 14 App Router** in both apps. React Server Components by default;
  client components only where browser-only APIs are needed.
- **Tailwind 3** + custom theme tokens via CSS variables in
  `packages/shared/styles/tokens.css`. **Do not hardcode colors** anywhere —
  always reference the token names.
- **Supabase** for postgres + auth + realtime. Use the `@supabase/ssr` client
  (not the legacy auth-helpers). Two helpers per app: `lib/supabase.ts`
  (anon, browser-safe) and `lib/supabase-server.ts` (service role, server-only).
- **Row-Level Security** is always on. PII tables are service-role only.
- **ElevenLabs Conversational AI** with `@elevenlabs/react`,
  `connectionType: "websocket"` (not WebRTC — proven ICE-timeout issues
  behind enterprise NAT). Inject runtime context via `dynamicVariables`:
  - `current_date_info` (computed in Asia/Amman)
  - `language` (caller's last detected language, defaults to `ar`)
- **n8n** workflows are imported as JSON. The canonical shape is:
  - Webhook node (POST, path matches tool name)
  - Function node verifies `X-Auth-Secret` header
  - Code node does the work
  - Respond-to-Webhook returns: `{ ok, data, message_for_agent, error_code, meta }`
- **Confirmation tokens.** Every write tool (`book_visit`, `reschedule_visit`,
  `cancel_visit`) requires a `confirmation_token` parameter the agent passes
  ONLY after explicit verbal "نعم". The n8n workflow rejects writes that
  lack it with `error_code: "CONFIRMATION_REQUIRED"`.
- **Placeholder guard.** Every n8n tool node rejects literal placeholders
  ("USER_PHONE_PLACEHOLDER", etc.) with `error_code: "PLACEHOLDER_DETECTED"`
  and the agent re-asks.

**File naming**:
- SQL migrations: snake_case, `NNNN_short_name.sql`.
- n8n workflow JSON: snake_case, named exactly like the tool.
- React components: PascalCase.
- Functions / hooks: camelCase.
- Routes: kebab-case directories.
- KB articles: snake_case, numbered `NN_topic.md`.

**i18n**:
- `packages/shared/i18n/dictionary.ts` exports `dict.ar` and `dict.en`.
  Same-keys parity is a compile-time check.
- All user-facing strings in both apps go through `t("key")`.
- HTML lang + dir attributes flip with the language toggle.

**Imports**:
- `@dawood/shared/*` for the shared package.
- `@/` for app-local paths.
- ESM throughout. `.mjs` for ad-hoc scripts.

**Jurisdiction env var**:
- Root `.env.example`: `JURISDICTION=JO` and `DEFAULT_TIMEZONE=Asia/Amman`.
- The pack is portable to KSA / UAE later by changing these two values.
- E.164 default country code is derived from `JURISDICTION` in the n8n
  phone-normaliser.

---

## D. Vertical glossary (Arabic + English)

Use these terms consistently in code, prompts, KB articles, and UI copy.

| English (canonical) | Arabic | Notes |
|---|---|---|
| Patient | مريض | The caller / data subject |
| MRN (medical record number) | رقم الملف الطبي | Spelled letter-by-letter when spoken |
| National ID | الرقم الوطني | Jordanian national ID. **Never spoken in full** |
| Visit | زيارة | Outpatient appointment; the main record |
| Facility | منشأة | Dawood Hospital — single facility |
| Specialty / Clinic | تخصص / عيادة | One of 7: cardiology, ENT, internal medicine, ophthalmology, pediatrics, dentistry, dermatology |
| Chief complaint | الشكوى الرئيسية | Open-ended Arabic description of what's wrong |
| Specialty suggestion | اقتراح العيادة | Bot's recommended clinic based on complaint |
| Visit type | نوع الزيارة | New consult, follow-up |
| Slot | موعد متاح | Open visit slot in a clinic's calendar |
| Reschedule | إعادة جدولة | Move an existing visit to a new date/time |
| Cancel | إلغاء | Withdraw an existing visit |
| Handover | تحويل | Bot escalates to a human; bot writes a 1–3 sentence Arabic summary |
| Consent | موافقة | Recording consent at call start |
| Insurance / payer | شركة التأمين | E.g. Jordan Insurance, MetLife, Arab Orient, etc. |
| KB | قاعدة المعرفة | The 17 markdown articles |
| The 7 specialties | السبع تخصصات | cardiology = القلب / ENT = الأنف والأذن والحنجرة / internal medicine = الباطنية / ophthalmology = العيون / pediatrics = الأطفال / dentistry = الأسنان / dermatology = الجلدية |

---

## E. The 4 use cases as playbooks

Each playbook below is the **skeleton** that the system prompt (step 05)
expands into full narrative.

### UC-D1 — General FAQ

1. Caller asks a general question (hours, location, parking, partners,
   how to pay, what to bring, what specialties Dawood offers).
2. Agent retrieves from the KB (semantic, top-K = 3).
3. Agent answers in 1–3 Arabic sentences. If KB returns nothing relevant,
   acknowledge honestly and offer handover.
4. After answer: "هل أستطيع مساعدتكم بشيء آخر؟" → on "لا" →
   CES → goodbye sequence.

No identification needed for UC-D1. If the caller starts asking about THEIR
specific visit, switch to UC-D3.

### UC-D2 — Visit booking with specialty triage

1. Greeting + consent.
2. Identification: ask for phone (Arabic, formal). Confirm digit-by-digit.
   Call `get_patient_by_phone(spoken_phone)`.
3. Branch:
   - Found → "أهلاً [الاسم]." continue to step 4.
   - Not found → "أهلاً بكم كمريض جديد. ما اسمكم الكامل؟" + DOB → register
     during booking step.
4. **Chief complaint**: ask one open question:
   "ممكن باختصار تخبرونني بشكوتكم اليوم، حتى أقترح عليكم العيادة المناسبة؟"
   (Or if caller already knows the specialty, skip to step 6.)
5. **Specialty suggestion**: call `suggest_specialty(chief_complaint)`. Then:
   - **High confidence** (one top match) → propose it: "حسب الوصف، يبدو أن
     عيادة [التخصص] هي المناسبة. هل تفضلون الحجز فيها؟"
   - **Low confidence** (two close matches) → offer both: "قد يناسبكم
     عيادة [الأول] أو عيادة [الثاني]. أيهما تفضلون؟"
   - **No match / unclear** → ask the caller directly: "أي عيادة تفضلون
     الحجز فيها — القلب، الأنف والأذن، الباطنية، العيون، الأطفال، الأسنان،
     أو الجلدية؟"
   - **Caller already specified** in step 4 → confirm and proceed.
   - The caller can ALWAYS override the suggestion.
6. Ask preferred date.
7. Call `check_availability(specialty, from_date, to_date)`.
8. Offer at most 3 slots.
9. **Confirmation gate**: read back specialty + date + time in Arabic.
   Wait for explicit "نعم".
10. Call `book_visit(...)` with a `confirmation_token = confirmed_<iso>`.
11. Read back booking reference letter-by-letter, then state confirmation
    channel (SMS or email).
12. CES question → goodbye sequence.

### UC-D3 — Reschedule / cancel / status check

1. Greeting + consent.
2. Identification (phone + confirm digits → `get_patient_by_phone`).
3. Call `list_visits(patient_id)` for upcoming visits.
   - **No upcoming visits** → "ليس لديكم مواعيد قادمة في النظام. هل تريدون
     حجز موعد جديد؟" → switch to UC-D2.
   - **One upcoming visit** → read it back: "موعدكم القادم في عيادة [التخصص]
     يوم [التاريخ] الساعة [الوقت]. كيف يمكنني مساعدتكم؟"
   - **Multiple visits** → disambiguate: "لديكم عدة مواعيد. أي واحد تقصدون —
     [موعد 1] أو [موعد 2]؟"
4. Branch on intent:
   - **Status only** ("just checking") → confirm details, CES, goodbye.
   - **Reschedule** → ask preferred new time → `check_availability` →
     offer slots → confirmation gate → `reschedule_visit` with token →
     read back → CES → goodbye.
   - **Cancel** → confirmation gate ("هل أنتم متأكدون من إلغاء الموعد؟") →
     `cancel_visit` with token → confirm done → CES → goodbye.

### UC-D4 — Multi-intent

UC-D1 + UC-D2 + UC-D3 in any order, plus:

- The caller may switch goals mid-conversation (FAQ → book → reschedule).
  Follow them; don't restart.
- **Facts the caller has already given carry across goal switches.** Phone,
  patient name, chief complaint, specialty pick — absorb silently if the
  caller mentions them; only re-ask if truly missing.
- Track the current sub-goal. Never write before confirmation.
- At the end, ask **one** CES question for the whole call.

---

## F. The 10 tool contracts

This table is the **single source of truth** for what tools exist, what
they take, what they return, and which subsystem implements them.
Steps 03 (DB), 05 (system prompt + tool schemas), and 06 (n8n workflows)
all consume this.

| # | Tool name | Purpose | Reads / writes | Used by |
|---|-----------|---------|----------------|---------|
| 1 | `get_patient_by_phone` | Look up patient by confirmed phone (E.164 normalised). Returns patient + upcoming visits summary. | reads `patients`, `visits` | UC-D2/D3 |
| 2 | `find_patient` | Fallback identification: MRN, OR name + DOB. | reads `patients` | UC-D2/D3 |
| 3 | `list_visits` | Patient's upcoming + recent visits. | reads `visits` | UC-D3 |
| 4 | **`suggest_specialty`** | NEW. Score chief complaint against `chief_complaint_patterns` (pg_trgm + weighted match). Return top 1–2 specialties with confidence. | reads `chief_complaint_patterns`, `specialties` | UC-D2 |
| 5 | `check_availability` | Open slots for a specialty + day range. | reads `slot_templates`, `slot_overrides`, `visits` | UC-D2/D3 |
| 6 | `book_visit` | Create a new visit (writes). Requires `confirmation_token`. | writes `visits`, `visit_intake`, `audit_log` | UC-D2 |
| 7 | `reschedule_visit` | Move an existing visit to a new slot. Requires `confirmation_token`. | writes `visits`, `audit_log` | UC-D3 |
| 8 | `cancel_visit` | Cancel a visit. Requires `confirmation_token`. | writes `visits`, `audit_log` | UC-D3 |
| 9 | `prepare_handover` | Log handover reason + Arabic summary + customer_data JSON. Returns `target_agent_id` (a static phone number / queue ref). | writes `handovers` | All UCs |
| 10 | `submit_ces_rating` | Capture Customer Effort Score 1–10 at end of call. | writes `customer_feedback` | All UCs |

**System tools** (provided by ElevenLabs, not by n8n):
- `transfer_to_agent` — routes the live call to the configured human queue.
- `end_call` — terminates the audio session.

**Plus 2 telemetry workflows** that are called by ElevenLabs' outbound
webhooks (NOT by the agent as tools):

| Webhook | Purpose | Writes |
|---------|---------|--------|
| `log_conversation_turn` | Persist every agent ↔ caller turn for the dashboard transcript view. | `turns` |
| `post_call_finalize` | End-of-call cleanup: aggregate outcome, mark conversation complete, write a row to `outcomes`. | `conversations`, `outcomes` |

Total n8n workflows in step 06: **10 agent-callable tools + 2 telemetry = 12**.

---

## G. Database high-level (full SQL comes in step 03)

Table groups, by migration:

- **0001_reference**: `facility` (single row — Dawood), `facility_hours`,
  `facility_holidays`, `specialties` (7 rows), `visit_types`,
  `slot_templates`, `slot_overrides`, **`chief_complaint_patterns`**.
- **0002_operational**: `patients`, `visits`, `visit_intake`
  (with `chief_complaint` NOT NULL + `suggested_specialty_id` nullable).
- **0003_telemetry**: `calls` / `conversations`, `turns`, `tool_calls`,
  `handovers`, `outcomes`, `customer_feedback`.
- **0004_governance**: `audit_log`, `consent_log`, `safety_events`,
  `admin_users`.
- **0005_indexes_and_rls**: hot-path indexes + RLS policies.
- **0006_realtime**: enables Postgres logical replication on `calls`,
  `turns`, `handovers` for dashboard streaming.

Step 03 will produce all 6 migrations + a seed.sql with: 1 facility,
7 specialties, ~40 chief_complaint_patterns (Arabic), 8 visit_types,
~30 slot_templates, 30 patients (Jordanian names + +962 phones),
60 historical visits.

Extensions enabled: `pgcrypto`, `pg_trgm` (for specialty matching).

---

## H. Knowledge Base content map

17 articles. All in Arabic. Frontmatter keys are English. Step 04 produces all 17.

### Generic (10 articles)

| # | Title (Arabic) | Category |
|---|----------------|----------|
| 01 | ساعات العمل وأوقات العيادات | hours |
| 02 | الموقع والوصول والمواقف | location |
| 03 | ما الذي أحضره معي للموعد | what_to_bring |
| 04 | طرق الدفع وفواتير العلاج | payment |
| 05 | شركات التأمين المتعاملة | insurance_partners |
| 06 | شروط حجز الموعد للمرضى الجدد | visit_prereq |
| 07 | سياسة الإلغاء وإعادة الجدولة | cancellation_policy |
| 08 | الخصوصية وتسجيل المكالمة | privacy_recording |
| 09 | الطوارئ — اتصلوا برقم الطوارئ مباشرة | emergency_redirect |
| 10 | نظرة عامة على عيادات مستشفى داوود | specialties_overview |

### Specialty mini-articles (7 articles, ~150 words each)

| # | Title (Arabic) | Category |
|---|----------------|----------|
| 11 | عيادة القلب — ما تعالج ومتى تزورها | specialty_cardiology |
| 12 | عيادة الأنف والأذن والحنجرة | specialty_ent |
| 13 | عيادة الباطنية | specialty_internal_medicine |
| 14 | عيادة العيون | specialty_ophthalmology |
| 15 | عيادة الأطفال | specialty_pediatrics |
| 16 | عيادة الأسنان | specialty_dentistry |
| 17 | عيادة الجلدية | specialty_dermatology |

---

## I. Dashboard page map

5 pages (plus the dynamic `/calls/[id]`).

| Route | Title | What it shows |
|-------|-------|---------------|
| `/` | نظرة عامة | Live counters (calls today, containment %, handovers today, CES avg). Latest 10 conversations. UC tiles (UC-D1 / UC-D2 / UC-D3 automation %). Activity feed. |
| `/calls` | المكالمات | Searchable / filterable call history (date, patient phone, outcome) |
| `/calls/[id]` | تفاصيل المكالمة | Single call: full transcript, tool calls timeline, outcome, CES, link to related visit |
| `/visits` | الزيارات | Visit inventory: scheduled / completed / cancelled / no_show; filter by specialty / date |
| `/handovers` | التحويلات | Handovers: reason_code, Arabic summary, customer_data, status |
| `/settings` | الإعدادات | Admin user management (read-only), retention windows display |

The dashboard is **Arabic-first RTL** with an English toggle. Editorial
design language: large numerals, rule lines, breath, monochrome with one
accent color from the theme tokens.

Step 08 produces all of the above in a single prompt with an internal
two-phase structure (Phase A: shell + auth + overview, Phase B: 4 remaining
pages).

---

## J. Compliance & data residency (REVIEW WITH LEGAL before going live)

**Data residency**:
- Supabase project in **EU-Frankfurt** (closest standard region with low
  latency to Jordan) OR self-hosted Postgres in-region if Jordan MoH
  requires it.
- ElevenLabs EU region default.
- n8n self-hosted in same region as Supabase.

**Identification & PII rules** (enforced by the system prompt + tool layer):
- Phone is the primary key, confirmed digit-by-digit before any record lookup.
- National ID is **never** read in full.
- MRN is spelled letter-by-letter, never bulk-read.
- Diagnosis, dosing, and medication advice are out of scope — handover.

**Consent** (captured every call):
- Recording consent: "هل تسمحون بتسجيل المكالمة لأغراض جودة الخدمة والتدريب؟"
- Logged to `consent_log` per conversation.
- A caller who declines recording is immediately handed over to the human
  queue.

**Retention**:
- Call recordings: **12 months** (configurable; defer specifics to Jordan
  MoH).
- Transcripts: **24 months**.
- Audit log: **7 years** (immutable; append-only via trigger).
- Patient PII deletion: via `scripts/delete_patient_data.mjs`.

**Access control**:
- Dashboard requires Magic Link auth + an `admin_users` row.
- All dashboard reads of PII go through server actions or RLS-protected
  queries. Anon client never sees PII.
- n8n uses service-role; the secret is stored in n8n credentials and
  never in code.

**Audit**:
- Every write tool produces an `audit_log` row.
- Audit log is append-only via constraint + RLS.

---

## K. Build order & verification gates

The 9-step build sequence (after this briefing). Each step must complete
and verify before the next prompt is pasted. **Do not start the next step
on your own** — wait for me to paste it.

| Step | What it produces | Verifies via |
|------|------------------|--------------|
| 01 | (this briefing — context only) | You acknowledge it |
| 02 | npm-workspace monorepo, two apps, shared package, env templates | `npm install` succeeds; `npm run dev:call` and `npm run dev:dashboard` start cleanly |
| 03 | 6 SQL migrations + seed (Jordan-flavored) | Migrations apply; seed inserts run; `select count(*) from specialties` returns 7 |
| 04 | 17 Arabic KB articles + KB README | `ls elevenlabs/kb/*.md \| wc -l` returns 17 (+ README) |
| 05 | system_prompt.md, tool_schemas.json, agent_settings.md, safety_guardrails.md, webhook_events.md | All files present; tool_schemas.json has 10 tools; system prompt is 25–35 KB |
| 06 | 12 n8n workflow JSONs | All present; each imports cleanly into n8n; `suggest_specialty` exists |
| 07 | apps/call/app/page.tsx + supporting code | `npm run dev:call` serves the orb on 3018; language/theme toggles work |
| 08 | apps/dashboard with 5 pages, auth, queries, realtime, editorial components | `npm run dev:dashboard` serves on 3019; Magic Link works; all 6 routes return 200 |
| 09 | Deploy scripts, runbook, KPI definitions, compliance doc, test dialogues, verify_booking.mjs | `node scripts/verify_booking.mjs` runs the full happy-path E2E |

**Discipline at every step**:
- Read the briefing's relevant sections before writing.
- Don't introduce libraries beyond what the briefing names.
- When unsure about a term, prefer the glossary (Section D) over your
  training knowledge.
- End every step by printing: what was created, what was skipped, what
  questions are flagged for the user, and the verification command.
- Then **STOP**. Do not write anything else until I paste the next prompt.

---

## L. RTL + Arabic-first conventions

The clone is **Arabic-first**. English is a toggle, not the default.

**HTML / CSS**:
- Root: `<html dir="rtl" lang="ar">` by default.
- Tailwind: use logical properties (`ps-4` not `pl-4`) wherever practical.
  Use `rtl:` and `ltr:` variant prefixes for direction-specific tweaks.
- The sidebar lives on the **right** in Arabic, **left** in English. Flip
  via `dir` + `flex-row-reverse` logic; do NOT hardcode either side.

**Typography**:
- UI font: Tahoma fallback (universally available) + IBM Plex Sans Arabic
  (preferred). Define the stack in `tokens.css`.
- Numerals in body copy: **Arabic-Indic** (٠١٢٣٤٥٦٧٨٩).
- Numerals in identifiers (booking refs, phone numbers, MRN): **Western
  digits** (0123456789). Identifiers must be unambiguous.

**Dates & time**:
- Calendar: Gregorian. Hijri may appear in parentheses on the dashboard
  but never as primary.
- Timezone: **Asia/Amman**. Stored in `DEFAULT_TIMEZONE` env var.
- Speech: the assistant reads dates as "يوم X الموافق Y من شهر Z" — full
  Arabic format.

**Phone numbers**:
- E.164: Jordan `+962XXXXXXXXX`. Local mobile prefix `07` → normalised to
  `+9627...`.
- Spoken: digit-by-digit, Arabic numerals out loud.

**Voice**:
- ElevenLabs Arabic voice — pick one appropriate for a hospital persona.
  The agent_settings template (step 05) has a slot `voice_id` you'll fill
  at deploy time. Stick with **Modern Standard Arabic** for comprehensibility
  across the Levant.

**Voice address**:
- Default to formal "أنتم" (plural "you" as formal). NEVER "أنت".
- Children's visits booked by a parent: the parent is "أنتم".

---

## M. What this pack does NOT decide

Defer / flag to humans:

- **Specific ElevenLabs voice ID** — pick after auditioning candidates.
- **Real EHR / HIS integration** — out of scope; this pack uses Supabase
  as the single source of truth.
- **Telephony vendor** — POC uses the ElevenLabs widget; SIP / Twilio is
  a follow-up workstream.
- **Legal vetting of compliance copy** — every consent script, retention
  copy, and policy line carries a "REVIEW WITH LEGAL" comment for Jordan
  MoH review.
- **Final dialect** — MSA defaults; Levantine-flavoured phrasing is a
  fine-tuning task post-POC.
- **Outbound campaigns** — out of scope; the POC is inbound + transactional
  SMS only.
- **Specific chief-complaint pattern rows** — step 03 generates a reasonable
  Arabic starter set (~40 patterns); clinical review by a Dawood
  physician is a separate workstream.

---

# End of master briefing.

Acknowledge it now (per the "How to respond" block at the very top). Then
wait for me to paste `02_scaffold.md`.
