# n8n Setup — Dawood Tool & Telemetry Workflows

End-to-end setup for the twelve n8n workflows (ten agent tools + two
telemetry) behind Salma.

## 1. Host n8n

Run n8n in the **same region as Supabase** (EU-Frankfurt). Either n8n.cloud,
or self-host with Docker:

```yaml
# docker-compose.yml (minimal)
services:
  n8n:
    image: n8nio/n8n:latest
    ports: ["5678:5678"]
    environment:
      - N8N_HOST=your.n8n.host
      - WEBHOOK_URL=https://your.n8n.host/
      - GENERIC_TIMEZONE=Asia/Amman
    volumes:
      - ./n8n-data:/home/node/.n8n
```

## 2. Set env vars (in n8n)

| Var | Value |
|---|---|
| `SUPABASE_URL` | `https://<project>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` 🔒 | service-role key (bypasses RLS) |
| `N8N_SHARED_SECRET` 🔒 | the `X-Auth-Secret` every tool webhook checks |
| `DEFAULT_TIMEZONE` | `Asia/Amman` |
| `JURISDICTION` | `JO` |
| `HANDOVER_TARGET_PHONE` | the human-queue destination returned by `prepare_handover` |

> One-time DB prerequisite: run the `suggest_specialty_score(...)` SQL function
> from `n8n/README.md` in Supabase — the `suggest_specialty` workflow calls it.

## 3. Import the workflows

```bash
node scripts/deploy_n8n.mjs            # dry run — create/update plan
node scripts/deploy_n8n.mjs --apply    # push + activate all 12
```

(Or import each `n8n/workflows/*.json` by hand via the n8n UI: *Workflows →
Import from File*.) Auth for the API is `X-N8N-API-KEY` — generate an admin API
key in n8n.

## 4. Activate each workflow

`deploy_n8n.mjs --apply` activates after create/update. If importing manually,
toggle each workflow **Active**. The twelve: `get_patient_by_phone`,
`find_patient`, `suggest_specialty`, `check_availability`, `book_visit`,
`reschedule_visit`, `cancel_visit`, `list_visits`, `prepare_handover`,
`submit_ces_rating` (tools) + `log_conversation_turn`, `post_call_finalize`
(telemetry).

## 5. Generate an admin API key

n8n → *Settings → API → Create API Key*. Set it as `N8N_API_KEY` for
`deploy_n8n.mjs`.

## 6. Smoke test

Webhook paths are **hyphenated** (the step-09 spec's `suggest_specialty` is the
workflow *name*; the URL path is `suggest-specialty`):

```bash
curl -X POST "$N8N_BASE_URL/webhook/suggest-specialty" \
  -H "X-Auth-Secret: $N8N_SHARED_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"chief_complaint":"عندي ألم في الصدر"}'
```

Expected envelope:

```json
{ "ok": true, "data": { "suggestions": [ ... ], "top_specialty_id": "…", "top_confidence": 0.82 },
  "message_for_agent": "…", "error_code": null, "meta": { ... } }
```

Then run the full chain: `node scripts/verify_booking.mjs` (steps 1–7 PASS).
