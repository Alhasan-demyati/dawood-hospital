# Deployment Status — Dawood Hospital (live wiring, 2026-06-04)

What was deployed against the live credentials, what works, and what remains.

## ✅ Working now

| Piece | Status |
|---|---|
| **Supabase DB** (`izadovsxorpdxfmndgen`) | 6 migrations applied + seed loaded + `suggest_specialty_score()` function + your email added to `admin_users`. Verified: specialties=7, facilities=1, visits=60, patients=30, patterns=45. |
| **Dashboard** (`apps/dashboard`, :3019) | Boots against the live DB; data layer returns real data (verified via REST). Login needs the Supabase Auth redirect URL added (below). |
| **ElevenLabs agent** (Salma) | Fully configured: system prompt (22.6k chars) + **10 webhook tools** + **17 KB articles** (RAG) + language `ar` + TTS `eleven_turbo_v2_5` + voice. |
| **Call app** (`apps/call`, :3018) | Boots with the real agent id; the orb starts a live Salma conversation (FAQ/KB works; booking tools need n8n below). |
| **n8n `specialty_id` bug** | Fixed in `n8n/workflows/check_availability.json` + `book_visit.json` (now read `specialty_id` with `specialty` fallback). |

## ⚠️ n8n — NOT deployed (security stop)

The n8n instance at `curizen.app.n8n.cloud` is a **shared, multi-tenant** instance: its Variables hold **other clients' production secrets** (Carglass, OpenAI, Microsoft/Azure, a `MASTER_ENCRYPTION_KEY`) **and a `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` pointing at a different project** (`pqstkafdlfsppkwlqjqu`). Our workflows read `$env.SUPABASE_*`, so on this instance they could read/write the **wrong database** — unacceptable for patient data.

**Action taken:** the 12 Dawood workflows that were briefly created here were **deleted**. They remain safely as files in `n8n/workflows/`.

**Required:** stand up a **dedicated n8n instance for Dawood**, then `node scripts/deploy_n8n.mjs --apply`.

## Remaining steps (yours)

1. **Supabase Auth redirect** — add `http://localhost:3019` and `http://localhost:3019/auth/callback` to *Auth → URL Configuration → Redirect URLs* so the dashboard Magic Link works. Then sign in at :3019 with the admin email you provisioned in *Supabase → Auth → Users*.
2. **Dedicated n8n** — provision an isolated instance; set its env: `N8N_SHARED_SECRET` (the value generated into `.env.local`), `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (project `izadovsxorpdxfmndgen`), `HANDOVER_TARGET_PHONE`, `DEFAULT_TIMEZONE=Asia/Amman`, `JURISDICTION=JO`. Deploy + activate the 12 workflows, then update the ElevenLabs tool base URL if it changed and run `node scripts/verify_booking.mjs`.
3. **ElevenLabs voice** — the agent has a working voice; audition/replace if desired.
4. **Rotate secrets** shared in chat (service-role key, DB password, ElevenLabs/n8n keys).
5. **Security review (Curizen):** the n8n API key in use can read **all** Variables across every project on the shared instance — review that key's scope.
