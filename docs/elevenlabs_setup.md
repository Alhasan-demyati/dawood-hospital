# ElevenLabs Setup — Salma Agent

End-to-end setup for the Dawood Hospital Conversational AI agent (**سلمى**).

## 1. Account, project, API key

- Create an ElevenLabs account; choose an **EU** project region (keeps voice
  processing in-region with the EU-Frankfurt Supabase — see `docs/compliance.md`).
- Generate an API key → set `ELEVENLABS_API_KEY` in the root `.env.local`
  (never committed).

## 2. Create the Salma agent

In the ElevenLabs console, create a Conversational AI agent named
`Salma — Dawood Hospital POC`. Note its agent id → `ELEVENLABS_AGENT_ID`
(root `.env.local`) and `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` (`apps/call/.env.local`).
Single agent — there is no secondary coordinator.

## 3. Audition an Arabic voice

The `voice_id` in `elevenlabs/agent_settings.md` is a placeholder until you
pick one. Audition **3–4 candidates** and compare on a warm, adult, female,
MSA-comprehensible-across-the-Levant register:

1. Search the ElevenLabs voice library for **"Arabic, female, warm, MSA"**.
2. Shortlist 3–4; read the same KB sentence (e.g. from
   `elevenlabs/kb/01_visiting_hours.md`) through each.
3. Prefer clear Modern Standard Arabic that a Jordanian caller hears as
   natural and unhurried; avoid heavy dialect.
4. Write the chosen voice id into `elevenlabs/agent_settings.md`
   (replace `<voice_id_slot_here>`), then redeploy.

## 4. Push the agent config

```bash
node scripts/deploy_elevenlabs.mjs            # dry run — prints the plan
node scripts/deploy_elevenlabs.mjs --apply    # push
```

Pushes the **system prompt** (`elevenlabs/system_prompt.md`), the **17 KB
articles** (`elevenlabs/kb/*.md`, excluding `README.md`; chunk 512 / overlap
64 / top-K 3 / threshold 0.30), the **10 tool schemas**
(`elevenlabs/tool_schemas.json`), and the **agent settings** (voice id once
set, model `eleven_multilingual_v2`, temperature 0.4, max tokens 1500,
language `ar`). The script skips the voice update while the id is still a
placeholder and warns.

> Each tool posts to `{{N8N_BASE_URL}}/webhook/<tool-name>` with header
> `X-Auth-Secret: {{N8N_SHARED_SECRET}}`. The actual webhook paths are
> **hyphenated** (`book-visit`, `get-patient-by-phone`, …).

## 5. Wire the outbound webhooks

Per `elevenlabs/webhook_events.md`, point the platform's outbound webhooks at
the n8n telemetry endpoints (hyphenated paths):

- `log_conversation_turn` → `{{N8N_BASE_URL}}/webhook/log-conversation-turn`
- `post_call_finalize` → `{{N8N_BASE_URL}}/webhook/post-call-finalize`

Plus the consent / handover / safety events documented there. All carry the
`X-Auth-Secret` header.

## 6. Test in the console

Paste the sample dialogues from `elevenlabs/test_dialogues/UC-D1_faq.md` into
the ElevenLabs agent tester and confirm Salma answers from the KB in Arabic,
asks "هل أستطيع مساعدتكم بشيء آخر؟", and closes with a CES question.

## 7. Save the agent id for the call app

Set `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` in `apps/call/.env.local`, then
`npm run dev:call` (3018) and click the orb to start a live session. The call
app injects the `current_date_info` (21-day Amman reference) and `language`
dynamic variables at session start.
