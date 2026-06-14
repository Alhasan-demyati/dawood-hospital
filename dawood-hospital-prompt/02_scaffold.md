<!-- Dawood Hospital simplification of hospitals/02_scaffold.md
     drops: ADMIN_ALLOWED_DOMAINS env, ELEVENLABS_HANDOVER_AGENT_ID env, nav_kpis + nav_facilities + nav_specialties keys, KSA timezone defaults
     adds:  JURISDICTION + DEFAULT_TIMEZONE=Asia/Amman in all .env.example files, @dawood/* namespace, Dawood-specific i18n keys, calmer teal-green accent -->

# STEP 02 — Scaffold the monorepo

> Prerequisites: step 01 complete — you have read `01_master_briefing.md`
> and acknowledged it. If not, stop and tell me.
>
> Scope: create the empty monorepo skeleton for the Dawood Hospital
> voicebot. No business logic, no UI beyond an Arabic placeholder, no
> SQL, no ElevenLabs wiring.
>
> Do NOT create real secrets or live env values. `.env.example` placeholders only.

## What to produce

A complete npm-workspace monorepo at the project root:

```
.
├── package.json          (workspaces: apps/*, packages/*)
├── tsconfig.base.json
├── .gitignore
├── .editorconfig
├── README.md
├── .env.example          (root-level shared vars)
├── apps/
│   ├── call/             (name: @dawood/call; next.config.mjs, tsconfig.json,
│   │                      tailwind.config.ts, postcss.config.mjs, .env.example,
│   │                      app/{layout,page,globals.css}, public/)
│   └── dashboard/        (name: @dawood/dashboard; same Next.js layout plus
│                          middleware.ts as an auth-gate placeholder)
└── packages/
    └── shared/           (name: @dawood/shared, type: module)
        ├── index.ts                   (barrel)
        ├── i18n/                      (dictionary.ts, LanguageProvider.tsx,
        │                               useLanguage.ts, types.ts, index.ts)
        ├── theme/                     (ThemeProvider.tsx, useTheme.ts)
        ├── lib/                       (utils.ts: cn / formatDateTime / formatDuration;
        │                               supabase-auth.ts: Magic Link stub)
        ├── ui/                        (LanguageToggle.tsx, ThemeToggle.tsx)
        ├── styles/                    (tokens.css, animations.css)
        └── tailwind/preset.ts         (Tailwind theme extension over the CSS vars)
```

Both apps' `layout.tsx` set `<html dir="rtl" lang="ar">` and mount the
language + theme providers. Their `page.tsx` files are Arabic placeholders
(call: "Call app — coming in step 07"; dashboard: "Dashboard — coming in
step 08"), rendered via `t("callPage_title")` / `t("dashboard_title")`.

## Concrete requirements

### Root `package.json`

```jsonc
{
  "name": "dawood-voicebot",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:call": "npm -w @dawood/call run dev",
    "dev:dashboard": "npm -w @dawood/dashboard run dev",
    "build": "npm -w @dawood/call run build && npm -w @dawood/dashboard run build",
    "build:call": "npm -w @dawood/call run build",
    "build:dashboard": "npm -w @dawood/dashboard run build",
    "start:call": "npm -w @dawood/call run start",
    "start:dashboard": "npm -w @dawood/dashboard run start",
    "typecheck": "npm -w @dawood/call run typecheck && npm -w @dawood/dashboard run typecheck",
    "lint": "npm -w @dawood/call run lint && npm -w @dawood/dashboard run lint"
  },
  "engines": { "node": ">=20" }
}
```

### Versions, linter, ports

- `next` ≥ 14.2, `react` ≥ 18.3, `typescript` ≥ 5.4 (strict mode on in
  `tsconfig.base.json`), `tailwindcss` ≥ 3.4, `@supabase/supabase-js` ≥ 2.45.
- `@supabase/ssr` ≥ 0.5 in `apps/dashboard` only — step 08 uses it for auth.
- `@elevenlabs/react` (latest) in `apps/call` — step 07 uses it.
- Linter: `eslint` + `eslint-config-next`; do not over-configure beyond defaults.
- Ports: `apps/call` on **3018**, `apps/dashboard` on **3019** (set via
  `next dev -p 3018` / `-p 3019`; same for `start`).

### Root `.env.example`

```
# Shared values referenced by deploy scripts only
JURISDICTION=JO
DEFAULT_TIMEZONE=Asia/Amman
SUPABASE_PROJECT_REF=
N8N_BASE_URL=
N8N_SHARED_SECRET=
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
```

### `apps/call/.env.example`

```
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=
JURISDICTION=JO
DEFAULT_TIMEZONE=Asia/Amman
DEFAULT_LOCALE=ar
```

### `apps/dashboard/.env.example`

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JURISDICTION=JO
DEFAULT_TIMEZONE=Asia/Amman
DEFAULT_LOCALE=ar
```

Note: NO `ADMIN_ALLOWED_DOMAINS`. Auth for Dawood is intentionally simple
— Magic Link plus an `admin_users` row check in step 08.

### `packages/shared/i18n/dictionary.ts`

Start with EXACTLY these keys (you'll grow this in later steps). The
nav set is **5 items** — no `nav_kpis`, no `nav_facilities`, no
`nav_specialties` (specialties are shown inline on the visits and
overview pages, not as a separate route):

```ts
export const dict = {
  ar: {
    appName: "مساعد مستشفى داوود الصوتي",
    callPage_title: "تحدّث مع سلمى الآن",
    callPage_start: "ابدأ المكالمة",
    dashboard_title: "لوحة عمليات مستشفى داوود",
    nav_overview: "نظرة عامة",
    nav_calls: "المكالمات",
    nav_visits: "الزيارات",
    nav_handovers: "التحويلات",
    nav_settings: "الإعدادات",
    languageToggle_ar: "العربية",
    languageToggle_en: "EN",
    common_loading: "جارٍ التحميل…",
    common_error: "حدث خطأ",
  },
  en: {
    appName: "Dawood Hospital Voice Assistant",
    callPage_title: "Speak with Salma now",
    callPage_start: "Start call",
    dashboard_title: "Dawood Hospital Operations",
    nav_overview: "Overview",
    nav_calls: "Calls",
    nav_visits: "Visits",
    nav_handovers: "Handovers",
    nav_settings: "Settings",
    languageToggle_ar: "العربية",
    languageToggle_en: "EN",
    common_loading: "Loading…",
    common_error: "An error occurred",
  },
} as const;

export type TranslationKey = keyof typeof dict.ar;

// Compile-time check that ar and en have parity
type AssertParity = keyof typeof dict.ar extends keyof typeof dict.en
  ? keyof typeof dict.en extends keyof typeof dict.ar
    ? true
    : false
  : false;
const _parityCheck: AssertParity = true;
```

### `packages/shared/styles/tokens.css`

Define CSS custom properties for: background, surface, text-primary,
text-muted, accent, accent-soft, border, success, warning, danger,
font-sans, font-display, radius-sm/md/lg. Provide BOTH light and dark
variants (use `[data-theme="dark"]`).

Palette for Dawood: cool navy base + a **calm teal-green medical accent**
(warmer than pure clinical blue — a muted teal around `#2E8B83` in light
mode, lifting to `#5FB8B0` in dark). Reassuring, not corporate. Exact
hex values are your call. Font stack: Tahoma fallback + IBM Plex Sans
Arabic, per the briefing's RTL conventions.

### `packages/shared/styles/animations.css`

`@keyframes reveal`, `pulse-dot`, `lift`; delay utilities `.delay-1`
through `.delay-5` (multiples of 80ms).

### `packages/shared/tailwind/preset.ts`

Tailwind preset that reads from the CSS vars (extend `theme.colors` to
map to `var(--color-…)`, `theme.fontFamily.sans` to `var(--font-sans)`,
etc.). Both apps' `tailwind.config.ts` extend this preset and add their
own `content` globs (including `../../packages/shared/**/*.{ts,tsx}`).

### Next configs and supabase-auth stub

- `apps/call/next.config.mjs` and `apps/dashboard/next.config.mjs`:
  include `transpilePackages: ["@dawood/shared"]` and `reactStrictMode: true`.
- `packages/shared/lib/supabase-auth.ts`: stub exporting
  `sendMagicLink(email: string): Promise<{ ok: boolean; error?: string }>`
  with a `// TODO: implement in step 08` comment.

### `README.md` and `.gitignore`

- README: one-sentence goal ("Arabic-first voice assistant for مستشفى
  داوود"), `npm install` instructions, how to run both apps, where env
  vars live, pointer to the prompt pack as source of truth.
- `.gitignore`: standard Next.js + Node + Supabase ignores —
  `node_modules/`, `.next/`, `.turbo/`, `.env*` (except `.env.example`),
  `*.log`, `.DS_Store`, `coverage/`, `dist/`.

## Execution discipline

- Run `npm install` at the root AFTER writing all package.jsons. Confirm it succeeds.
- **Do NOT install anything I didn't list.** Flag it in the report block instead.
- Use the `Write` tool for every file; do not `cp` from anywhere.
- Both placeholder pages MUST render Arabic from the shared dictionary
  (`t("callPage_title")` / `t("dashboard_title")`) — this proves the
  i18n wiring before step 07 / 08.
- `<html dir="rtl" lang="ar">` is hardcoded in both layouts for now.
  The language toggle (added in step 07 / 08) will flip dir + lang via
  `LanguageProvider`.
- Dawood is **single-facility, Jordan-only**. No facility-picker, no
  region selector, no jurisdiction switcher.

## Report back

When done, print:

1. Tree of files created (depth = 3 is enough).
2. Output of `npm install` (last 10 lines).
3. Output of `npm run dev:call` started for 5 seconds, then SIGINT.
4. Output of `npm run dev:dashboard` started for 5 seconds, then SIGINT.
5. Any deviations you made from the spec, and why.

## Verification (the human will run this)

```bash
cd <project>
npm install                  # succeeds, no peer-dep errors, lockfile created
npm run dev:call &           # http://localhost:3018 returns 200
                             #   HTML contains "تحدّث مع سلمى الآن" or
                             #   "مساعد مستشفى داوود الصوتي"
npm run dev:dashboard &      # http://localhost:3019 returns 200
                             #   HTML contains "لوحة عمليات مستشفى داوود"
kill %1 %2
```

Both pages MUST render Arabic in an RTL layout: confirm via inspector
that `<html dir="rtl" lang="ar">` is set and text is right-aligned.

## STOP

**Stop here.** Do NOT continue to writing migrations, KB articles, or
any other file beyond the scaffold scope. Wait for me to paste
`03_database.md`.
