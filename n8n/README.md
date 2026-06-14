# n8n workflows — Salma / Dawood Hospital

12 workflow JSONs implementing the 10 agent tool webhooks + 2 telemetry
webhooks. Each is a self-contained n8n export (Webhook → Auth Check →
validation/logic Code node(s) → Supabase via `this.helpers.httpRequest` →
Respond to Webhook). No n8n credentials objects — every workflow reads
secrets from **environment variables** so import is one drag-and-drop.

```
n8n/workflows/
  get_patient_by_phone.json   find_patient.json        list_visits.json
  suggest_specialty.json      check_availability.json  book_visit.json
  reschedule_visit.json       cancel_visit.json        prepare_handover.json
  submit_ces_rating.json      log_conversation_turn.json  post_call_finalize.json
```

## Required one-time DB setup (suggest_specialty)

`suggest_specialty` scores the chief complaint with **pg_trgm** through a
Postgres function. Create it once against your Supabase database before
the smoke test (the trigram index already exists from migration `0001`):

```sql
create or replace function public.suggest_specialty_score(complaint text)
returns table (specialty_id uuid, name_ar text, name_en text, code text, color_hex text, score real)
language sql
stable
as $$
  select s.id, s.name_ar, s.name_en, s.code, s.color_hex,
         (greatest(similarity(p.pattern_ar, complaint), 0) * p.weight)::real as score
    from public.chief_complaint_patterns p
    join public.specialties s on s.id = p.specialty_id
   where p.pattern_ar % complaint
      or similarity(p.pattern_ar, complaint) > 0.15
   order by score desc
   limit 5;
$$;

-- service_role calls it via PostgREST rpc; keep it off the anon role:
revoke execute on function public.suggest_specialty_score(text) from anon;
grant execute on function public.suggest_specialty_score(text) to service_role;
```

The n8n workflow calls it via `POST /rest/v1/rpc/suggest_specialty_score`
with body `{ "complaint": "<normalised text>" }`.

## How to import

n8n → **Workflows → Import from File** → select each JSON in
`workflows/` (or drag the folder; n8n imports each as a separate
workflow). They import with `"active": true`. The webhook paths are the
hyphenated tool names (e.g. `/webhook/suggest-specialty`).

## Required environment variables

Set these on the n8n instance (Settings → Variables, or process env):

| Var | Purpose |
|---|---|
| `N8N_SHARED_SECRET` | shared secret ElevenLabs sends as `X-Auth-Secret`; the Auth Check node rejects mismatches |
| `SUPABASE_URL` | Supabase REST base, e.g. `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role JWT (sent as `apikey` + `Authorization: Bearer …`); bypasses RLS |
| `JURISDICTION` | defaults to `JO`; controls Jordan E.164 phone normalisation |
| `DEFAULT_TIMEZONE` | defaults to `Asia/Amman`; date displays are rendered in this zone |
| `HANDOVER_TARGET_PHONE` | *(optional)* the single human-queue destination returned by `prepare_handover` (defaults to `+96265000000`) |

## Auth header

Every webhook expects `X-Auth-Secret: $N8N_SHARED_SECRET`. The first Code
node ("Auth Check") compares it and returns
`{ ok:false, error_code:"AUTH_REJECTED" }` on mismatch.

## Smoke test (write-free)

```bash
curl -sS -X POST "$N8N_BASE_URL/webhook/suggest-specialty" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Secret: $N8N_SHARED_SECRET" \
  -d '{"conversation_id":"00000000-0000-0000-0000-000000000000",
       "chief_complaint":"عندي ألم في صدري ودوخة"}' | jq .
# expected: ok=true, top_specialty_id pointing at cardiology
```

## No mock-mode

This pack writes **directly** to Supabase — there is no
`<INTEGRATION>_MODE` env var. For a sandbox, point `SUPABASE_URL` at a
separate Supabase project.

## Notes / conventions

- **Standard envelope** everywhere: `{ ok, data, message_for_agent,
  error_code, meta }`.
- **Guarded writes**: validation errors short-circuit as an `ok:false`
  envelope that flows through later nodes untouched, so `book_visit` /
  `reschedule_visit` / `cancel_visit` never insert on a bad request
  (e.g. missing `confirmation_token`). Branching is done in the Code
  nodes rather than with If nodes, which keeps the JSON portable across
  n8n versions.
- **Timezone**: dates are assumed `Asia/Amman` = UTC+3 (Jordan has no
  DST). Slot generation and all `*_display_ar` / `*_display_en` strings
  use this.
- **Booking references**: `DV-XXXXX`, 5 chars from an unambiguous
  alphabet (no `0/O/1/I`). `DV` = Dawood Visit.
- **tool_calls**: `suggest_specialty` and `post_call_finalize`'s batch
  path write the same column shape — `{ conversation_id, tool_name,
  request_json, response_json, ok, error_code, latency_ms,
  confirmation_token? }`.
- **No materialised views** in this pack; `post_call_finalize` returns
  `kpi_refreshed: false` — the dashboard computes KPIs live.
