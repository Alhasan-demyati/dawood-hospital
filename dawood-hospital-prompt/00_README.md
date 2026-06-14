<!-- Dawood Hospital simplification of hospitals/00_README.md
     drops: multi-region, telephony-deferred section, 12-page dashboard mention, 18-workflow mention, 6 UCs mention
     adds: 7-specialty triage flow, Jordan jurisdiction, single-facility framing -->

# مستشفى داوود — Voicebot Prompt Pack (read this first)

This pack contains **10 prompts** that you paste, one at a time and in order,
into a fresh Claude Code session inside an empty project folder. The pack
builds a working Arabic-first voice assistant for **مستشفى داوود (Dawood
Hospital)** — a single hospital in Jordan with 7 specialty clinics
(cardiology, ENT, internal medicine, ophthalmology, pediatrics, dentistry,
dermatology).

This is the **simplified pack** — narrower scope than the full hospitals/
prompt pack. It targets a real first deployment, not a multi-facility
enterprise.

The intended end state is a working clone with:

- `apps/call` — customer-facing voice orb (Arabic / English, RTL)
- `apps/dashboard` — internal ops dashboard (**5 pages**, realtime, Magic Link auth)
- `packages/shared` — i18n, theme, UI primitives
- `elevenlabs/` — system prompt, **17 KB articles**, tool schemas, agent settings
- `n8n/workflows/` — **12 tool webhooks** including `suggest_specialty` for chief-complaint triage
- `supabase/migrations/` — **6 SQL migrations** + Jordan-flavored seed
- `scripts/`, `docs/` — deploy, runbook, KPI definitions, compliance notes

## How to use this pack

1. **Create an empty project folder** on your machine (e.g. `~/dawood-voicebot/`).
2. **Open Claude Code** in that folder (`cd ~/dawood-voicebot && claude`).
3. Open `01_master_briefing.md`, copy the **entire contents**, and paste it as
   your first message to Claude. Wait for Claude to acknowledge it has read and
   understood the briefing.
4. Then paste `02_scaffold.md` as the next message. Let Claude execute it
   completely (it will scaffold the monorepo). Inspect what was created.
5. Continue with `03_database.md`, `04_knowledge_base.md`, … through to
   `09_scripts_docs_and_qa.md` in numeric order. Each prompt is a single
   message you paste; do not interleave other tasks in the same conversation.
6. After each prompt completes, Claude will print a **verification block**
   telling you how to test that step before moving on.

**Do not skip steps.** Later prompts reference artifacts produced by earlier
ones (the system prompt in step 05 references KB articles written in step 04,
which reference the database schema written in step 03, etc.).

## Expected duration per step

Rough estimates for a single Claude Code session on Sonnet 4.6+:

| Step | Prompt | Wall-clock |
|------|--------|------------|
| 01   | Briefing (Claude only reads, doesn't write code) | 2–3 min |
| 02   | Scaffold | 5–10 min |
| 03   | Database + Jordan seed | 10–15 min |
| 04   | Knowledge Base (17 articles) | 18–28 min |
| 05   | ElevenLabs agent (system prompt + tools) | 12–20 min |
| 06   | n8n workflows (12 JSONs) | 25–40 min |
| 07   | Call app | 15–25 min |
| 08   | Dashboard (5 pages, two-phase) | 35–55 min |
| 09   | Scripts, docs, QA | 15–25 min |

**Total: roughly 2.5–4 hours of Claude-time** for a complete build. Plus your
review time between steps.

This is about half the time of the full hospitals/ pack (4–8 hours) because
this pack has fewer use cases, fewer workflows, fewer KB articles, and a
smaller dashboard.

## If a step fails midway

- **Truncated output (Claude stopped writing mid-file):** ask Claude
  `"continue writing the previous file from where it stopped"`. Do NOT re-paste
  the prompt — that restarts the whole step.
- **Wrong content (e.g. KSA leaked in, wrong entity name):** ask Claude
  `"that file uses [wrong term]; the entity is [right term] per the master
  briefing — rewrite the file"`. Reference the master briefing's glossary.
- **Step skipped a file:** ask Claude `"you didn't create [filename] — please
  create it now following the same pattern as the others"`.
- **Verification command failed:** paste the error to Claude and ask for a fix.
  Do NOT proceed to the next step until the verification passes.
- **Conversation context exhausted:** you can start a new Claude Code session.
  Re-paste `01_master_briefing.md` as the first message, then proceed with the
  next prompt you were on.

## Optional: have the Belron source on disk

If you have the original Belron POC at `/Users/alhasan/Documents/belron last
version/belron-voicebot-poc/`, Claude can consult it as a structural reference
(NOT for copy-paste). The master briefing mentions this. It speeds up steps
06 and 08 in particular because Claude can pattern-match against a known-good
example. You do NOT need the Belron source for the pack to work.

## What this pack does NOT do

- It does not pre-create a GitHub repo, a Supabase project, an ElevenLabs
  agent, or an n8n instance. Those are operational steps you do before /
  during deployment (covered in `docs/runbook.md` produced by step 09).
- It does not select a specific ElevenLabs Arabic voice ID — left as a slot
  in agent settings (step 05).
- It does not get legal sign-off on the compliance copy — every compliance-
  touching file is generated with a "REVIEW WITH LEGAL" callout for Jordan
  MoH review.
- It does not wire up telephony. The clone uses the ElevenLabs browser widget
  for voice. Telephony is OPTIONAL future work.
- It does not handle: lab/imaging results, insurance pre-authorization,
  pharmacy refills, after-hours triage with on-call nurse. These are out
  of scope for this simplified pack; see the full `hospitals/` pack if you
  need them.
- It does not include a second handover agent. Escalations route to a single
  human queue / phone number.
- It does not include multi-facility logic. Dawood is treated as a single
  facility (the database supports adding more, but workflows and prompts
  don't ask the caller "which branch?").

## What's special about this pack — the specialty triage

The single biggest difference from the full hospitals/ pack: this voicebot
**suggests the right specialty clinic** based on the caller's chief complaint.

Flow:

1. Caller says they need an appointment.
2. Bot asks the chief complaint in open Arabic ("اعطنا فكرة باختصار عن شكواكم").
3. Bot calls `suggest_specialty(complaint)` — an n8n workflow that scores
   the complaint against patterns in `chief_complaint_patterns` (Postgres
   `pg_trgm` similarity + weighted matching) and returns the top 1–2
   specialty matches with a confidence score.
4. If high confidence → bot proposes the specialty: "حسب الوصف، يبدو أن
   عيادة القلب هي المناسبة. هل أحجز لكم فيها؟"
5. If low confidence → bot offers top 2: "قد يناسبكم عيادة الباطنية أو
   عيادة القلب. أيهما تفضلون؟"
6. Caller can ALWAYS override: "لا، أريد عيادة الأطفال" → bot proceeds with
   the caller's pick.

The patterns table is editable via SQL — ops can tune the triage without
redeploying the bot.

## What to do AFTER the pack completes

1. Run the local dev servers: `npm run dev:call` (port 3018), `npm run
   dev:dashboard` (port 3019).
2. Create a Supabase project (Jordan-region or EU-Frankfurt), run the
   migrations, seed the demo data.
3. Create an ElevenLabs agent, upload the system prompt + KB articles +
   tool schemas (script provided).
4. Deploy n8n (self-hosted or cloud), import the 12 workflows.
5. Wire env vars between the three runtimes.
6. Run `node scripts/verify_booking.mjs` end-to-end smoke test.
7. Read `docs/runbook.md` and `docs/compliance.md` end-to-end before any
   real patient calls.

Good luck. Proceed to `01_master_briefing.md` to start.
