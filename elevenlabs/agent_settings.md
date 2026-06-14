# Agent Settings — Salma / Dawood Hospital

Copy-paste reference for configuring the ElevenLabs Conversational AI
agent in the dashboard UI. Single agent (no Hayat coordinator).

## Core

| Setting | Value |
|---|---|
| **Agent name** | `Salma — Dawood Hospital POC` |
| **Language** | `ar` (Arabic, default for the whole call) |
| **Voice ID** | `<voice_id_slot_here>` — pick an ElevenLabs Arabic voice (search "Arabic, female, warm, MSA"). **Audition before launch.** |
| **Model** | `eleven_multilingual_v2` (most reliable Arabic at time of writing — re-verify when ElevenLabs updates) |
| **Temperature** | `0.4` |
| **Max tokens per response** | `1500` |
| **Tool timeout** | `8000ms` |
| **Connection type** | `websocket` (NOT WebRTC — proven ICE-timeout issues behind enterprise NAT, per master briefing) |

## System prompt

Paste the full contents of [`system_prompt.md`](./system_prompt.md) into
the agent's system-prompt field. It is the single source of Salma's
behaviour (identity, language rules, the 4 playbooks, handover, CES,
forbidden behaviours).

## Knowledge base upload

Upload **all 17 articles** from [`kb/`](./kb/) — `01_visiting_hours.md`
through `17_specialty_dermatology.md`. **Exclude `kb/README.md`.**

| Param | Value |
|---|---|
| Semantic chunk size | `512` |
| Chunk overlap | `64` |
| Top-K | `3` |
| Similarity threshold | `0.30` |
| Language | `ar` |

> Upload via `scripts/deploy_elevenlabs.mjs` (produced in step 09), not by
> hand, so chunking + metadata stay consistent across re-uploads.

## Tools

Register the **10 tools** from [`tool_schemas.json`](./tool_schemas.json).
Each posts to `{{N8N_BASE_URL}}/webhook/<tool-name>` with header
`X-Auth-Secret: {{N8N_SHARED_SECRET}}`. Plus the two **system tools**
provided by ElevenLabs: `transfer_to_agent` (routes to the human queue)
and `end_call`.

## Dynamic variables

Injected at session start by `apps/call`:

| Variable | Type | Notes |
|---|---|---|
| `current_date_info` | string | 21-day weekday reference, computed in `Asia/Amman` |
| `language` | string | caller's last detected language; default `ar` |

System variables referenced by the prompt: `{{system__time_utc}}`,
`{{system__caller_id}}`.

## Outbound webhook events

Enable all **8** events documented in
[`webhook_events.md`](./webhook_events.md): `conversation_started`,
`turn_logged`, `tool_invoked`, `consent_changed`, `handover_triggered`,
`call_completed`, `kb_retrieved` (deferred / may no-op), `safety_event`.

## Environment / secrets (set in ElevenLabs + n8n, never in code)

- `{{N8N_BASE_URL}}` — base URL of the n8n instance.
- `{{N8N_SHARED_SECRET}}` — shared secret sent as `X-Auth-Secret`.
- Voice ID and ElevenLabs API key live in the ElevenLabs project, not in
  this repo.
