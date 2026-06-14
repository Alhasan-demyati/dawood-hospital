# Dawood Hospital Voicebot — مساعد مستشفى داوود الصوتي

Arabic-first voice assistant for **مستشفى داوود** (Dawood Hospital, Jordan) —
a single hospital with 7 specialty clinics. The assistant **سلمى (Salma)**
answers inbound calls, handles FAQ / booking / reschedule-cancel-status, and
hands over to human staff when out of scope. A separate operations dashboard
gives staff a live view of calls, visits, and handovers.

This repository is built step-by-step from the prompt pack in
[`dawood-hospital-prompt/`](./dawood-hospital-prompt/) — **that pack is the
source of truth**. This step (02) produces only the empty monorepo scaffold.

## Layout

```
apps/call/        @dawood/call       — public ElevenLabs orb (port 3018)
apps/dashboard/   @dawood/dashboard  — internal ops dashboard (port 3019)
packages/shared/  @dawood/shared     — i18n, theme, design tokens, UI atoms
```

## Prerequisites

- Node.js **20+** (uses npm workspaces — not pnpm, not yarn)

## Install

```bash
npm install        # at the repo root; installs all workspaces + creates the lockfile
```

## Run

```bash
npm run dev:call        # http://localhost:3018
npm run dev:dashboard   # http://localhost:3019
```

Other scripts: `npm run build`, `npm run typecheck`, `npm run lint`
(each also available per-app via `build:call`, `build:dashboard`, etc.).

## Environment variables

`.env.example` files mark every variable the project needs. Copy each to a
sibling `.env` (or `.env.local` inside each app) and fill in real values —
**never commit real secrets**.

- Root `.env.example` — shared values used by deploy scripts.
- `apps/call/.env.example` — ElevenLabs agent id + locale/timezone.
- `apps/dashboard/.env.example` — Supabase URL/keys + locale/timezone.

Jurisdiction is fixed to **Jordan** (`JURISDICTION=JO`,
`DEFAULT_TIMEZONE=Asia/Amman`). The pack is portable to other regions later by
changing those two values.

## Conventions

- **Arabic-first + RTL** everywhere (`<html dir="rtl" lang="ar">` by default).
- TypeScript strict mode, Next.js 14 App Router, Tailwind 3 with theme tokens
  defined as CSS variables in `packages/shared/styles/tokens.css` — **never
  hardcode colors**.
- All user-facing copy flows through `t("key")` against
  `packages/shared/i18n/dictionary.ts` (Arabic + English parity enforced at
  compile time).
