<!-- Dawood Hospital simplification of hospitals/06_n8n_workflows.md
     drops: get_visit, find_nearest_facility, get_facility_hours (folded into KB article 01),
            get_order_status, get_preauth_status, request_refill, log_tool_call (folded into
            post_call_finalize), mock-vs-live env switching, per-integration mode flags,
            multi-jurisdiction phone defaults
     adds: suggest_specialty.json as the NEW Dawood-specific exemplar (pg_trgm scoring),
           single-jurisdiction Jordan E.164 normaliser, folded tool_calls write inside
           post_call_finalize, booking reference DV-XXXXX (Dawood Visit) -->

# STEP 06 — n8n workflows (10 tool webhooks + 2 telemetry)

> Prerequisites: steps 01–05 complete. Verify `elevenlabs/tool_schemas.json`
> exists and has 10 tools, and that `supabase/migrations/0001_reference.sql`
> created the `chief_complaint_patterns` table.
>
> Scope of THIS prompt: produce all 12 n8n workflow JSONs that implement
> the tool webhooks ElevenLabs calls and the two outbound telemetry
> webhooks ElevenLabs fires for the dashboard transcript / outcome
> aggregation. Plus `n8n/README.md` for import + smoke-test guidance.

## What to produce

```
n8n/
├── README.md
└── workflows/
    ├── get_patient_by_phone.json
    ├── find_patient.json
    ├── list_visits.json
    ├── suggest_specialty.json        ← NEW, Dawood-specific
    ├── check_availability.json
    ├── book_visit.json
    ├── reschedule_visit.json
    ├── cancel_visit.json
    ├── prepare_handover.json
    ├── submit_ces_rating.json
    ├── log_conversation_turn.json
    └── post_call_finalize.json       ← also writes tool_calls rows
```

12 files. No `get_visit`, no `find_nearest_facility`, no
`get_facility_hours` (single-facility hours live in KB article 01).
No lab / imaging / preauth / refill workflows. No standalone
`log_tool_call` — `post_call_finalize` writes the `tool_calls` rows
during end-of-call aggregation.

## Canonical workflow skeleton (every workflow follows this)

Each workflow is a JSON file in n8n's standard export format
(`{"name": "...", "nodes": [...], "connections": {...},
"settings": {...}, "active": true, ...}`).

Standard node chain:

```
1. Webhook node (POST /webhook/<tool-name>)
2. Auth check Function node — verifies X-Auth-Secret header
3. Validation + business logic Function node (the bulk of the work)
4. Supabase HTTP node(s) — REST calls to the Supabase REST API
5. Respond to Webhook node — returns the standard envelope
```

Standard response envelope:

```json
{
  "ok": true,
  "data": { ... },
  "message_for_agent": "Optional caller-friendly recovery hint",
  "error_code": null,
  "meta": { "duration_ms": 124, "version": "v1" }
}
```

## Standard helpers (paste into Code nodes that need them)

Standard auth check (every workflow):

```js
const expected = $env.N8N_SHARED_SECRET;
const got = ($input.first().headers || {})['x-auth-secret'];
if (!expected || got !== expected) {
  return [{ json: { ok: false, error_code: 'AUTH_REJECTED' }, statusCode: 401 }];
}
return [{ json: $input.first().json }];
```

Standard placeholder-detection helper (any workflow that accepts
user-provided strings):

```js
function isPlaceholder(s) {
  if (typeof s !== 'string') return false;
  return /USER_.*_PLACEHOLDER|PLACEHOLDER|YOUR_.*|<<.*>>|\{\{.*\}\}/i.test(s)
      || /^[A-Z_]{8,}$/.test(s);
}
```

If any user-provided field is a placeholder, return:

```json
{ "ok": false,
  "error_code": "PLACEHOLDER_DETECTED",
  "message_for_agent": "Re-extract the actual value from the caller's spoken words." }
```

Standard E.164 phone normaliser — Jordan default (`JURISDICTION=JO`).
KSA/UAE are reserved slots for later:

```js
function toE164(spoken, country) {
  country = country || ($env.JURISDICTION || 'JO');
  let d = (spoken || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+')) return d;
  if (d.startsWith('00')) return '+' + d.slice(2);
  if (country === 'JO') {
    // Jordan mobile prefixes are 077 / 078 / 079 → +9627X...
    if (d.startsWith('07') && d.length === 10) return '+962' + d.slice(1);
    if (d.startsWith('962')) return '+' + d;
    if (d.length === 9 && /^[78]\d/.test(d.slice(1))) return '+962' + d;
  }
  return d.startsWith('+') ? d : '+962' + d;
}
```

No mock-vs-live switching. Every workflow reads/writes Supabase
directly. There is no `<INTEGRATION>_MODE` env var pattern in this
pack.

## Tool contracts (one row per workflow; produce JSON to match)

| # | Workflow | Webhook path | Required input | Output `data` shape | Reads / writes | Key business rules |
|---|----------|--------------|----------------|---------------------|----------------|---------------------|
| 1 | get_patient_by_phone | `/get-patient-by-phone` | `conversation_id`, `spoken_phone` | `{ found, patient: {...}\|null, recent_visits: [...] }` | reads `patients`, `visits` | E.164 normalise to JO; never read PHI if `found=false`; include up to 3 most-recent visits |
| 2 | find_patient | `/find-patient` | one of: `mrn`, `booking_reference`, OR `name`+`dob` | `{ found, patient \| null, recent_visits }` | reads `patients`, `visits` | At least one identifier required; case-insensitive Arabic name match |
| 3 | list_visits | `/list-visits` | `patient_id`, optional `status[]` | `{ visits: [...] }` | reads `visits` | Order by `scheduled_start` desc; max 10; include `specialty_name_ar` |
| 4 | **suggest_specialty** | `/suggest-specialty` | `conversation_id`, `chief_complaint` (Arabic) | `{ suggestions: [{ specialty_id, name_ar, name_en, code, color_hex, confidence }], top_specialty_id, top_confidence }` | reads `chief_complaint_patterns`, `specialties`; writes `tool_calls` | pg_trgm scoring; top 2; confidence in [0,1] |
| 5 | check_availability | `/check-availability` | `specialty` (id OR code), `from_date` (tstz), `to_date` (tstz) | `{ slots: [{ start, end, display_ar, display_en, room_id }] }` | reads `slot_templates`, `slot_overrides`, `visits` | All slots strictly in the future; max 10 returned; subtract booked rooms; respect Asia/Amman |
| 6 | book_visit | `/book-visit` | `spoken_phone`, `specialty`, `start_time`, `chief_complaint`, `suggested_specialty_id` (nullable), `picked_by` ('patient'\|'bot_suggestion'\|'staff_override'), optional `mrn`, optional `payer`, REQUIRED `confirmation_token` | `{ booking_reference, visit_id, scheduled_start_display_ar }` | writes `visits`, `visit_intake`, `audit_log` | Reject without `confirmation_token`; resolve `specialty` to UUID; insert atomic; generate `DV-XXXXX` |
| 7 | reschedule_visit | `/reschedule-visit` | `visit_id` OR `booking_reference`, `new_start`, REQUIRED `confirmation_token` | `{ visit_id, scheduled_start_display_ar }` | writes `visits`, `audit_log` | Same-day duplicate guard applies; same specialty only |
| 8 | cancel_visit | `/cancel-visit` | `visit_id` OR `booking_reference`, optional `reason`, REQUIRED `confirmation_token` | `{ visit_id, cancelled_at }` | writes `visits`, `audit_log` | Don't delete — set status='cancelled', save reason |
| 9 | prepare_handover | `/prepare-handover` | `conversation_id`, `reason_code`, `summary_ar`, `customer_data` (jsonb) | `{ handover_id, target_agent_id }` | writes `handovers` | Target agent resolved from a static mapping per reason_code (single human queue) |
| 10 | submit_ces_rating | `/submit-ces-rating` | `conversation_id`, one of: `score` (1–10), `declined` (bool) | `{ ces_id }` | writes `customer_feedback`, `outcomes` (CES column) | Single row per conversation |
| 11 | log_conversation_turn | `/log-conversation-turn` | `conversation_id`, `turn_index`, `speaker`, `text_raw`, `language` | `{ turn_id }` | writes `turns` | Idempotent on `(conversation_id, turn_index)` |
| 12 | post_call_finalize | `/post-call-finalize` | `conversation_id`, `ended_at`, `outcome`, optional `tool_calls[]` (batched) | `{ conversations_updated, outcomes_inserted, tool_calls_written, kpi_refreshed }` | writes `conversations`, `outcomes`, `tool_calls` | Folds the old `log_tool_call` write here — iterate `tool_calls[]` and bulk-insert; trigger materialised-view refresh asynchronously |

## Exemplar workflow #1 — `suggest_specialty.json` (write this one in full)

This is the **new, Dawood-specific** workflow with no counterpart in
the hospitals/ pack. Write it end-to-end as an importable n8n JSON
file. It must include:

- Webhook node `path: suggest-specialty`, POST, response mode "When
  workflow completes".
- Auth Check Function node (standard pattern).
- Function node "Validate input":
  - Reject if `chief_complaint` missing or `isPlaceholder(...)`.
  - Reject if `chief_complaint.trim().length < 3` → `INPUT_TOO_SHORT`.
  - Lower-case + strip diacritics for matching (keep original for audit).
- HTTP Request node to Supabase REST executing this Postgres query
  (cleanest path: wrap it in a SQL function `suggest_specialty_score`
  and call via `POST /rest/v1/rpc/suggest_specialty_score`):

  ```sql
  SELECT s.id AS specialty_id, s.name_ar, s.name_en, s.code, s.color_hex,
         GREATEST(similarity(p.pattern_ar, $1), 0) * p.weight AS score
    FROM chief_complaint_patterns p
    JOIN specialties s ON s.id = p.specialty_id
   WHERE p.pattern_ar % $1 OR similarity(p.pattern_ar, $1) > 0.15
   ORDER BY score DESC LIMIT 5;
  ```

- Function node "Aggregate + normalise":
  - Group rows by `specialty_id`; sum scores per specialty.
  - Sort desc; `total_score = sum of all specialty totals`.
  - `top_confidence = total_score > 0 ? Math.min(1, specialties[0].score / total_score) : 0`.
  - Return `suggestions = specialties.slice(0, 2)` with each suggestion
    carrying its own `confidence = score / total_score` (clamped to [0,1]).
- Function node "Write audit row" — single Supabase REST insert into
  `tool_calls`:

  ```json
  { "conversation_id": "<from input>", "tool_name": "suggest_specialty",
    "request":  { "chief_complaint": "<trimmed>" },
    "response": { "top_specialty_id": "...", "top_confidence": 0.81, "suggestions": [...] },
    "ok": true, "error_code": null, "latency_ms": 42 }
  ```

- Respond to Webhook node returning:

  ```json
  { "ok": true,
    "data": {
      "suggestions": [
        { "specialty_id": "...", "name_ar": "القلب", "name_en": "Cardiology",
          "code": "cardiology", "color_hex": "#C0392B", "confidence": 0.81 },
        { "specialty_id": "...", "name_ar": "الباطنية", "name_en": "Internal Medicine",
          "code": "internal_medicine", "color_hex": "#2980B9", "confidence": 0.19 }
      ],
      "top_specialty_id": "...", "top_confidence": 0.81
    },
    "message_for_agent": null, "error_code": null,
    "meta": { "duration_ms": 87, "version": "v1" } }
  ```

- Empty-result branch (SQL returned zero rows): return
  `{ suggestions: [], top_specialty_id: null, top_confidence: 0 }` with
  `message_for_agent: "No specialty matched; ask the caller to pick directly."`.
- Error branches: `PLACEHOLDER_DETECTED`, `INPUT_TOO_SHORT`.

## Exemplar workflow #2 — `book_visit.json` (write this one in full)

`book_visit` is the most complex write in the pack — write it end-to-
end as an importable n8n JSON file. It must include:

- Webhook node `path: book-visit`, POST, response mode "When workflow
  completes".
- Auth Check Function node (standard pattern).
- Function node "Validate + normalise":
  - Placeholder detection on every user field.
  - Reject if `confirmation_token` missing → `CONFIRMATION_REQUIRED`.
  - E.164 normalisation via `toE164(spoken_phone, 'JO')`.
  - Resolve `specialty` (UUID, code, OR Arabic name) to `specialty_id`
    by querying Supabase REST against `specialties`.
  - Validate `start_time` is in the future (Asia/Amman) and inside
    the single-row `facility_hours` table (no per-branch logic).
  - Check the same-day-duplicate constraint
    (`one_active_visit_per_patient_per_day`).
- Function node "Insert visit":
  - Generate booking reference `DV-XXXXX` (5 alphanumeric, no
    confusable chars — no `0`, `O`, `1`, `I`). `DV` = Dawood Visit.
  - Insert into `visits` with `status='scheduled'`.
  - Insert into `visit_intake` with `chief_complaint` (verbatim),
    `suggested_specialty_id` (nullable, passed in from a prior
    `suggest_specialty` call if any), and `picked_by`
    (`'patient'` | `'bot_suggestion'` | `'staff_override'`).
  - Insert into `audit_log` with `actor='agent'`,
    `action='book_visit'`, `before=null`, `after={visit_row}`,
    `confirmation_token=<the token>`.
- Respond to Webhook node returning:

  ```json
  { "ok": true,
    "data": {
      "booking_reference": "DV-7K9F2",
      "visit_id": "<uuid>",
      "scheduled_start": "2026-06-15T10:00:00+03:00",
      "scheduled_start_display_ar": "الأحد، ١٥ يونيو ٢٠٢٦، الساعة العاشرة صباحاً",
      "specialty": { "id": "...", "code": "cardiology", "name_ar": "القلب" }
    },
    "message_for_agent": null, "error_code": null }
  ```

- Error branches: `CONFIRMATION_REQUIRED`, `PLACEHOLDER_DETECTED`,
  `SPECIALTY_NOT_FOUND`, `OUTSIDE_HOURS`, `DUPLICATE_ACTIVE_VISIT`.

Use "If" nodes for branching, Code nodes for JS, HTTP Request nodes
for Supabase calls authenticated with the **service-role key** from
`$env`.

## Directives for the remaining 10 workflows

Produce each workflow **one file at a time**, in this order, and print
a one-line checkpoint after each:

1. `get_patient_by_phone.json` (read pattern with PHI gating)
2. `find_patient.json`
3. `list_visits.json`
4. `check_availability.json` (slot algebra)
5. `reschedule_visit.json` (write — mirror book_visit branches)
6. `cancel_visit.json` (soft-delete pattern)
7. `prepare_handover.json`
8. `submit_ces_rating.json`
9. `log_conversation_turn.json`
10. `post_call_finalize.json` (writes `tool_calls` batch + outcomes)

Pattern enforcement:

- Every workflow has the auth check node.
- Every workflow that takes user input runs the placeholder detector.
- Every write workflow checks `confirmation_token` (except telemetry
  workflows which are system-fired).
- Every workflow ends with a Respond-to-Webhook node returning the
  standard envelope.
- Every write workflow writes an `audit_log` row.
- Every workflow returns server-computed display strings
  (`*_display_ar`, `*_display_en`) for any timestamp it returns.

Checkpoint format: `✓ check_availability.json — 6 nodes, 4 connections`.

## `n8n/README.md` — what to produce

Short README covering:

- **How to import**: n8n → Workflows → Import from File → drag the
  `workflows/` folder; n8n imports each as a separate workflow.
- **Required env vars** (every workflow):
  - `N8N_SHARED_SECRET` — shared secret ElevenLabs sends as `X-Auth-Secret`.
  - `SUPABASE_URL` — Supabase REST base URL.
  - `SUPABASE_SERVICE_ROLE_KEY` — service-role JWT.
  - `JURISDICTION` — defaults to `JO`; controls phone normalisation.
  - `DEFAULT_TIMEZONE` — defaults to `Asia/Amman`.
- **Auth header**: every webhook expects `X-Auth-Secret: $N8N_SHARED_SECRET`.
- **Smoke test** — one-liner `curl` against `suggest_specialty`
  (safest write-free workflow to test):

  ```bash
  curl -sS -X POST "$N8N_BASE_URL/webhook/suggest-specialty" \
    -H "Content-Type: application/json" \
    -H "X-Auth-Secret: $N8N_SHARED_SECRET" \
    -d '{"conversation_id":"00000000-0000-0000-0000-000000000000",
         "chief_complaint":"عندي ألم في صدري ودوخة"}' | jq .
  # expected: ok=true, top_specialty_id pointing at cardiology
  ```

- **No mock-mode**: this pack writes directly to Supabase. There is
  no `<INTEGRATION>_MODE` env var; for a sandbox, point `SUPABASE_URL`
  at a separate Supabase project.

## Execution discipline

- Output is JSON — pay attention to escaping and node IDs (n8n uses
  UUID-like node IDs; generate unique ones per workflow file).
- Do not invent n8n node types — use only built-in `n8n-nodes-base.*`
  types: `webhook`, `function` (Code), `httpRequest`, `if`,
  `respondToWebhook`, `set`.
- Use n8n's standard empty `pinData: {}`.
- Each workflow gets `"active": true` so it's enabled on import.
- Do not write workflows that depend on n8n credentials objects —
  use env vars in HTTP headers directly. (Easier import; the user
  wires credentials later if they prefer.)
- **Write workflows ONE FILE AT A TIME** — print the checkpoint
  line after each before starting the next. Do not batch all 12
  into one mega-response; the JSON is too large to remain valid
  under truncation pressure.
- Do not install any n8n packages or run any n8n CLI. The user
  imports these JSONs into their own n8n instance.

## Report back

When done, print:

1. The 12 file names with file size and node count per file.
2. The list of error codes produced across all workflows (de-duped).
3. The list of env vars referenced across all workflows (de-duped).
4. Any tool where you simplified the contract from the table above —
   say what you skipped and why.
5. The `tool_calls` insert shape used both by `suggest_specialty`
   and by `post_call_finalize`'s batch path — confirm they match.

## Verification (the human will run)

```bash
# 1) Count workflow files — expect 12
ls -la n8n/workflows/*.json | wc -l

# 2) Validate JSON for every workflow
for f in n8n/workflows/*.json; do
  python3 -m json.tool "$f" > /dev/null && echo "OK $f" || echo "BAD $f"
done

# 3) Spot-check exemplar complexity
jq '.nodes | length' n8n/workflows/book_visit.json          # expect 7+
jq '.nodes | length' n8n/workflows/suggest_specialty.json   # expect 6+

# 4) Confirm every workflow has the auth check node
for f in n8n/workflows/*.json; do
  jq -e 'any(.nodes[]; .name == "Auth Check" or .name == "Verify Auth")' "$f" \
    > /dev/null || echo "MISSING AUTH: $f"
done

# 5) Confirm the suggest_specialty SQL is present (pg_trgm operators)
grep -q "similarity(" n8n/workflows/suggest_specialty.json \
  && grep -q "chief_complaint_patterns" n8n/workflows/suggest_specialty.json \
  && echo "OK suggest_specialty SQL present" || echo "BAD suggest_specialty SQL missing"

# 6) Confirm post_call_finalize folds tool_calls
grep -q "tool_calls" n8n/workflows/post_call_finalize.json \
  && echo "OK post_call_finalize writes tool_calls" \
  || echo "BAD post_call_finalize missing tool_calls write"

# 7) Confirm there is NO standalone log_tool_call workflow
[ ! -f n8n/workflows/log_tool_call.json ] && echo "OK no log_tool_call" \
  || echo "BAD log_tool_call should have been folded into post_call_finalize"
```

## STOP

Stop here. Wait for me to paste `07_call_app.md`.
