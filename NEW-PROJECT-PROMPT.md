# BUILD PROMPT — Dawood Hospital Voice‑Agent Platform ("Clinical Atelier" edition)

> **How to use this file:** Open a brand‑new, empty project in Claude Code and paste this entire document as your first prompt (or save it as `PROMPT.md` in the new repo and tell Claude: *"Read PROMPT.md and build the whole platform exactly as specified, verifying as you go."*). It is fully self‑contained: it specifies the stack, the monorepo, the database, both apps, and — most importantly — the complete **Clinical Atelier** design system baked in from the very first commit.

---

## 0. Role & working agreement

You are a senior full‑stack + product designer building a **production‑grade, bilingual (Arabic‑first RTL / English LTR), light+dark** hospital platform. Work in disciplined phases, and **verify continuously**: run `typecheck`, `lint`, and `build`, and take headless‑Chrome screenshots in **all four** combinations (light/dark × ar/en) before declaring any screen done. Never claim something works without showing the command output. Use logical CSS properties only (never physical left/right). Every user‑facing string goes through the i18n `t()` function — no hardcoded copy.

Build order (each phase must be green before the next): **tokens → type & motion → shared graphics → i18n & theme → data layer → call app → dashboard shell → dashboard components → dashboard pages → full verification.**

---

## 1. What you are building

**Dawood Hospital** is a Jordanian hospital. Two Next.js apps share one design system in an npm‑workspaces monorepo:

1. **`apps/call`** (port **3020**) — a calm, premium **patient‑facing voice assistant** page. A caller taps a glowing voice **orb** and talks to "Salma", an ElevenLabs voice agent, to book/триage/ask. Shows a live transcript, a consent notice, and trust cards over a serene hospital‑campus skyline.
2. **`apps/dashboard`** (port **3021**) — an **operations dashboard** for hospital staff: live KPIs, call logs + transcripts, visits, human handovers, and settings. Realtime‑updating, magic‑link auth.

Both are **Arabic‑first** (default `lang=ar`, `dir=rtl`), instantly switchable to English (LTR), with a polished light **and** dark theme. Backend is **Supabase** (Postgres + RLS + Realtime). The voice agent runs on **ElevenLabs**; tool calls are fulfilled by **n8n** webhooks (out of scope to build — just persist their telemetry).

The product's signature: **a single gold "vital line" (EKG/heartbeat) motif threads the entire platform** — the call hero, the dashboard masthead underline, loading bars, empty‑state flatlines, and metric‑card flourishes. The product literally has a pulse.

---

## 2. Tech stack (non‑negotiable)

- **Next.js 14** (App Router, RSC), **TypeScript strict**, **React 18**.
- **Tailwind CSS 3.4** driven entirely by **CSS custom properties** (no hardcoded hex in components except DB‑driven specialty `color_hex`). A shared Tailwind **preset** maps semantic class names → CSS vars so theme switching is pure CSS.
- **npm workspaces** monorepo: `apps/*` + `packages/*`. Node ≥ 20.
- **Supabase**: `@supabase/ssr` (browser + server cookie clients) and `@supabase/supabase-js` (service‑role). RLS on; Realtime publication for live inserts.
- **ElevenLabs**: `@elevenlabs/react` (`useConversation`, **websocket** connection).
- **Fonts via Google Fonts** `@import`: **IBM Plex Sans Arabic** (body) + **Readex Pro** (display). No other font families.
- Per‑app scripts: `dev` / `start` (server port read from each app's `.env.local` `PORT` via dotenv-cli — call 3020, dashboard 3021), `build`, `lint`, `typecheck (tsc --noEmit)`.

---

## 3. Monorepo layout

```
.
├─ package.json                # workspaces: ["apps/*","packages/*"]; root dev/build/lint/typecheck scripts
├─ tsconfig.base.json
├─ .env.local                  # gitignored; real keys
├─ .env.example
├─ supabase/
│  ├─ migrations/0001..0006.sql
│  └─ seed.sql
├─ packages/shared/            # @dawood/shared
│  ├─ index.ts                 # barrel: i18n, theme, lib/utils, supabase-auth, ui
│  ├─ i18n/{dictionary.ts,LanguageProvider.tsx,useLanguage.ts,types.ts,index.ts}
│  ├─ theme/{ThemeProvider.tsx,index.ts}
│  ├─ ui/{LanguageToggle.tsx,ThemeToggle.tsx,index.ts, graphics/*}
│  ├─ lib/{utils.ts,supabase-auth.ts}
│  ├─ styles/{tokens.css,type.css,animations.css}
│  ├─ tailwind/preset.ts
│  └─ tsconfig.json
├─ apps/call/                  # @dawood/call  (port 3020)
│  ├─ app/{layout.tsx,page.tsx,globals.css,loading.tsx,privacy/page.tsx,_components/*}
│  ├─ lib/{elevenlabs.ts,date-context.ts}
│  ├─ tailwind.config.ts, postcss.config.mjs, tsconfig.json, package.json
└─ apps/dashboard/             # @dawood/dashboard  (port 3021)
   ├─ app/{layout.tsx, (app)/*, login/*, auth/callback, globals.css}
   ├─ components/*  (DashboardShell, Sidebar, editorial/*, charts/*, filters/*, tables)
   ├─ lib/{queries.ts,kpis.ts,supabase.ts,supabase-server.ts,realtime.ts,format.ts}
   ├─ middleware.ts, tailwind.config.ts, postcss.config.mjs, tsconfig.json, package.json
```

Root `package.json` scripts:
```json
{
  "scripts": {
    "dev": "npm run dev:call & npm run dev:dashboard & wait",
    "dev:call": "npm -w @dawood/call run dev",
    "dev:dashboard": "npm -w @dawood/dashboard run dev",
    "build": "npm -w @dawood/call run build && npm -w @dawood/dashboard run build",
    "typecheck": "npm -w @dawood/call run typecheck && npm -w @dawood/dashboard run typecheck",
    "lint": "npm -w @dawood/call run lint && npm -w @dawood/dashboard run lint"
  }
}
```
Each app's `tailwind.config.ts` uses the shared preset and globs `./app/**`, `./components/**`, `../../packages/shared/**`.

---

## 4. THE CLINICAL ATELIER DESIGN SYSTEM  ★ (the heart — get this right first)

**Concept:** a serene, clinical‑premium operations aesthetic — deep **emerald‑teal** anchor + a single **refined gold** accent (trust + luxury), warm mint‑ivory surfaces, atmospheric depth (grain + gradient mesh), and bespoke medical graphics. Light is default; dark is equally polished.

**Six principles:**
1. **Layered clinical depth** — a 4‑step surface ramp + a hairline ramp; real shadows + an inset top‑highlight, never flat fills. Cards read like clean acrylic instruments over paper.
2. **Editorial hierarchy with air** — a tight display scale, generous section spacing, and a consistent **kicker → title → rule** rhythm on every screen.
3. **Medical motifs as a quiet system** — one shared, token‑painted SVG motif library (EKG pulse, cross, specialty glyphs) used as accents, empty states, watermarks. One motif per context.
4. **Orchestrated, reduced‑motion‑safe motion** — staggered entrance reveals; chart draw‑ins; the signature vital line. Everything gated behind `@media (prefers-reduced-motion: reduce)`.
5. **RTL‑first discipline** — logical properties only. Critically: **Arabic never gets uppercase letter‑tracking** (an English convention). Labels use a language‑aware eyebrow.
6. **Gold is the signature, not the body** — gold only on hairline lead‑ins, kicker ticks, the emblem/cross, one stroke on the orb. Never a fill, never body text, ≤ 1 gold element per card.

**Unforgettable element — the `VitalLine`:** one gold EKG trace reused platform‑wide (call hero underline, masthead underline, loading bar, empty‑state flatline, card hover flourish).

### 4.1 Design tokens — `packages/shared/styles/tokens.css` (create EXACTLY)

```css
:root {
  /* Surfaces — warm mint-ivory, layered (4 steps) */
  --color-background: #e8efeb;
  --color-surface: #ffffff;
  --color-surface-2: #f3f8f5;
  --color-surface-3: #eaf2ee;        /* recessed wells: table headers, transcript bg, code */
  --color-surface-raised: #ffffff;   /* popovers / drawers */
  /* Text */
  --color-text-primary: #0b2926;
  --color-text-muted: #557078;
  --color-text-faint: #88a0a3;       /* timestamps, axis ticks, captions */
  /* Primary accent — deep emerald-teal */
  --color-accent: #157d76;
  --color-accent-soft: #d4ebe6;
  --color-accent-strong: #0d5f5a;
  /* Secondary accent — refined gold (signature only, sparingly) */
  --color-accent-2: #b0823a;
  --color-accent-2-soft: #f0e6cd;
  /* Lines */
  --color-hairline: #e3ece8;
  --color-border: #d6e4df;
  --color-border-strong: #c3d8d2;
  /* Focus ring */
  --color-ring: #157d76;
  --ring-offset: var(--color-surface);
  /* Status */
  --color-success: #2f9e6b;
  --color-warning: #c5841d;
  --color-danger: #c0463b;
  /* Chart palette (chart-1/3 reference accents so they auto-shift in dark) */
  --chart-1: var(--color-accent);
  --chart-2: #0e7490;  /* cyan */
  --chart-3: var(--color-accent-2);
  --chart-4: #6d8a4f;  /* sage */
  --chart-5: #b06a4a;  /* clay */
  /* Typography */
  --font-sans: "IBM Plex Sans Arabic", "Readex Pro", Tahoma, "Segoe UI", system-ui, -apple-system, sans-serif;
  --font-display: "Readex Pro", "IBM Plex Sans Arabic", Tahoma, "Segoe UI", system-ui, -apple-system, sans-serif;
  /* Radii */
  --radius-sm: 8px; --radius-md: 14px; --radius-lg: 22px;
  /* Elevation */
  --shadow-sm: 0 1px 2px rgba(11,41,38,.06), 0 1px 1px rgba(11,41,38,.04);
  --shadow-md: 0 10px 30px -8px rgba(11,41,38,.14);
  --shadow-lg: 0 30px 70px -18px rgba(11,41,38,.22);
  --shadow-glow: 0 0 0 1px rgba(21,125,118,.08), 0 20px 50px -20px rgba(21,125,118,.4);
  --shadow-card: 0 1px 2px rgba(11,41,38,.05), 0 6px 16px -8px rgba(11,41,38,.12);
  --shadow-pop: 0 24px 60px -18px rgba(11,41,38,.28);
  --highlight-top: inset 0 1px 0 rgba(255,255,255,.7);
  /* Atmosphere */
  --gradient-mesh:
    radial-gradient(60% 42% at 100% -8%, color-mix(in srgb, var(--color-accent) 14%, transparent), transparent 62%),
    radial-gradient(48% 42% at -6% 110%, color-mix(in srgb, var(--color-accent-2) 9%, transparent), transparent 60%);
  --grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E");
}
[data-theme="dark"] {
  --color-background: #05151a;
  --color-surface: #0d2329;
  --color-surface-2: #112b32;
  --color-surface-3: #0a1d23;
  --color-surface-raised: #143038;
  --color-text-primary: #e9f2f0;
  --color-text-muted: #86a0a6;
  --color-text-faint: #6b878d;
  --color-accent: #45b3a8;
  --color-accent-soft: #103330;
  --color-accent-strong: #6fcabf;
  --color-accent-2: #d8b15c;
  --color-accent-2-soft: #2a2414;
  --color-hairline: #163139;
  --color-border: #1d3b41;
  --color-border-strong: #2a4d54;
  --color-ring: #45b3a8;
  --color-success: #4fba85; --color-warning: #e0a24a; --color-danger: #e06b5e;
  --chart-2: #38bdf8; --chart-4: #9bbd6e; --chart-5: #d98c6a;
  --shadow-sm: 0 1px 2px rgba(0,0,0,.4);
  --shadow-md: 0 14px 36px -10px rgba(0,0,0,.55);
  --shadow-lg: 0 34px 80px -20px rgba(0,0,0,.65);
  --shadow-glow: 0 0 0 1px rgba(69,179,168,.12), 0 24px 60px -22px rgba(69,179,168,.45);
  --shadow-card: 0 1px 2px rgba(0,0,0,.45), 0 8px 20px -10px rgba(0,0,0,.6);
  --shadow-pop: 0 28px 70px -18px rgba(0,0,0,.7);
  --highlight-top: inset 0 1px 0 rgba(255,255,255,.05);
  --gradient-mesh:
    radial-gradient(60% 42% at 100% -8%, color-mix(in srgb, var(--color-accent) 16%, transparent), transparent 62%),
    radial-gradient(48% 42% at -6% 110%, color-mix(in srgb, var(--color-accent-2) 11%, transparent), transparent 60%);
  --grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E");
}
```

### 4.2 Tailwind preset — `packages/shared/tailwind/preset.ts`

Map **every** token above to a semantic Tailwind name. Colors: `background, surface, surface-2, surface-3, surface-raised, text-primary, text-muted, text-faint, accent, accent-soft, accent-strong, accent-2, accent-2-soft, border, border-strong, hairline, ring, success, warning, danger, chart-1..5`. `boxShadow: sm, md, lg, glow, card, pop`. `fontFamily: sans→var(--font-sans), display→var(--font-display)`. `borderRadius: sm/md/lg`. **Never** use slash‑opacity on these tokens (e.g. `bg-accent/20`) — they're CSS vars and it compiles to nothing; use `color-mix(in srgb, var(--color-…) NN%, transparent)` or the `*-soft` tokens.

### 4.3 Typography — `packages/shared/styles/type.css` (plain classes, RTL‑safe)

Both fonts loaded via one Google Fonts `@import` at the top of each app's `globals.css`. Then these opt‑in classes (never double‑apply a conflicting Tailwind font‑size):
- `.t-display-xl` Readex 700 `clamp(2.2rem,4.6vw,3.4rem)/1.04`; `.t-display-lg` 700 `clamp(1.8rem,3.4vw,2.6rem)/1.06`; `.t-display-md` 600 `clamp(1.4rem,2.4vw,1.9rem)/1.1`. Negative letter‑spacing **only** under `html[lang="en"]`.
- `.t-numeral` display 700 `tabular-nums` (every big metric).
- `.t-body` .95rem/1.6, `.t-body-sm` .84rem/1.55, `.t-caption` .72rem/1.4 (→ text‑faint).
- **`.t-eyebrow`** (the key fix): `font-weight:600; font-size:.7rem; color:var(--color-text-muted)`. **Only** `html[lang="en"] .t-eyebrow { text-transform:uppercase; letter-spacing:.14em }`; `html[lang="ar"] .t-eyebrow { font-size:.75rem; letter-spacing:0 }`. Use this for ALL labels/kickers/column headers/tags — it replaces every `uppercase tracking-[…]`.

### 4.4 Motion — `packages/shared/styles/animations.css` (shared) + per‑app `globals.css`

Shared keyframes/classes: `reveal` (`.animate-reveal` 0.5s), `pulse-dot` (`.animate-pulse-dot`), `lift`, `.delay-1..5` (80ms steps), and the signature:
```css
.vital-draw { stroke-dasharray: var(--vital-len,300); stroke-dashoffset: var(--vital-len,300);
  animation: vital-draw 1.5s cubic-bezier(.32,.72,0,1) .15s both; }
@keyframes vital-draw { to { stroke-dashoffset: 0 } }
.vital-loop { stroke-dasharray: var(--vital-dash,34) var(--vital-gap,240); animation: vital-loop 2.8s linear infinite; }
@keyframes vital-loop { to { stroke-dashoffset: -274 } }
.animate-shimmer { background-size: 200% 100%; animation: shimmer 1.6s ease-in-out infinite; }
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
.motif-drift { animation: motif-drift 22s ease-in-out infinite; }
@keyframes motif-drift { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
@media (prefers-reduced-motion: reduce){
  .animate-reveal,.animate-pulse-dot,.animate-lift,.vital-draw,.vital-loop,.animate-shimmer,.motif-drift{animation:none!important}
  .vital-draw{stroke-dashoffset:0!important}
}
```
**Dashboard `globals.css`** adds chart motion (all reduced‑motion‑guarded): `.chart-bar`(bar-grow), `.chart-grow`(grow-x; RTL flips transform-origin), `.donut-wrap`(donut-pop), `.ring-seg`(ring-draw), `.spark-line`/`.spark-area`(spark-draw/area-rise), `.meter-fill`(meter-grow), `.sheen::after`(sheen-sweep diagonal shine), `.node-pop`. Plus `.app-bg` = `var(--grain), var(--gradient-mesh)`‑style radial wash over `--color-background`, `background-attachment:fixed`.
**Call `globals.css`** adds the orb + skyline system (see §8).

### 4.5 Shared graphics — `packages/shared/ui/graphics/*` (server‑safe, token‑painted SVG)

Export all via `ui/index.ts` (`export * from "./graphics"`) so they're reachable from `@dawood/shared`. None need `"use client"` (pure SVG, no hooks).
- **`MedicalGlyph({name,strokeWidth?,className})`** — one registry (`viewBox 24`, `fill=none stroke=currentColor`, rounded caps). Names at least: `cross, pulse, heart, stethoscope, phone, calendar, visit, handover, shield, smile, grid, settings, refresh, hospital, user, users, clock, globe, tool, document, sparkle, bone, search, filter`. Fall back to `cross` for unknown. (This consolidates every inline nav/card icon.)
- **`VitalLine({color?,mode?,strokeWidth?,height?})`** — the signature. An EKG path with one calm beat near center across a 300‑wide viewBox, `preserveAspectRatio="none"`, `vectorEffect="non-scaling-stroke"`, `pathLength={300}`. `mode`: `draw` (`.vital-draw`), `loop` (`.vital-loop`), `static`. Default color gold (`var(--color-accent-2)`).
- **`SpecialtyGlyph({color,name?})`** — tinted glyph chip; `color` = DB `color_hex` (the one allowed data‑driven color).
- **`GradientMesh({grain?})`** — full‑bleed decorative layer using `--gradient-mesh` (+grain). For login / topbar wash.
- **`SectionMotif({name?,size?,drift?})`** — faint oversized glyph watermark (~5% opacity, accent).
- **`EmptyArt({variant})`** — bespoke empty‑state illustrations per context: `calls` (phone + flatline), `visits` (calendar + gold cross), `handovers` (two arrows at rest + node), `transcript` (dashed speech bubbles), `chart` (axis + flatline), `generic`. Structure in `currentColor`, gold heartbeat accents explicit.

---

## 5. i18n & theme (`packages/shared`)

- **`dictionary.ts`**: `export const dict = { ar: {...}, en: {...} } as const`. `export type TranslationKey = keyof typeof dict.ar`. Add a **compile‑time parity assertion** so ar and en always have identical keys. Keys cover: call app (`callPage_*, callOrb_*, call_*, consent_*, trust_*, transcript_empty, mic_permission_needed`), shell/nav (`dashboard_title, nav_overview/calls/visits/handovers/settings, nav_section`), overview (`overview_kicker, overview_vitals_title, overview_live_label, overview_counter_*, charts_section, chart_*, overview_uc_tiles_title, uc_d1..4, overview_latest_conversations, overview_activity_feed, activity_tag_*`), sidebar (`sidebar_*`), kickers/subs (`kicker_calls/visits/handovers/settings/call_detail`, `calls_page_sub`/etc.), tables/filters (`col_*, calls_col_*, filter_*, prev, next, refresh`), outcomes/reasons/status (`outcome_*, reason_*, status_*, handover_status_*`), call detail (`call_detail_*`), settings (`settings_*`), auth (`login_*, signout`), misc (`yes, no, common_loading, common_error, live_now, view_source_call, empty_state_generic`).
- **`LanguageProvider`** (`"use client"`, default `ar`): persists to `localStorage["dawood.lang"]`; on mount **hydrates from storage AND reconciles `document.documentElement` `lang`+`dir`** (so a reloaded EN session stays LTR and `.t-eyebrow` keys correctly). `setLang`/`toggleLang` update state + storage + html attributes. `t(key) = dict[lang][key] ?? dict.ar[key] ?? key`. `dirFor(lang) = lang==='ar' ? 'rtl' : 'ltr'`. Expose `{ lang, dir, setLang, toggleLang, t }` via `useLanguage()` (throws outside provider).
- **`ThemeProvider`** (`"use client"`, default `light`): persists `localStorage["dawood.theme"]`; syncs `data-theme` on `<html>`; `useTheme()` → `{ theme, setTheme, toggleTheme }`.
- **`ui/LanguageToggle` / `ui/ThemeToggle`** — small bordered buttons (focus ring) wired to the contexts.
- **Format helpers** live in `apps/dashboard/lib/format.ts` (mirror what's needed in the call app via `lib/date-context.ts`): `toArabicIndicDigits`, `toWesternDigits`, `formatArabicDate(d,tz)`, `formatArabicTime`, `formatArabicDateTime`, `formatPhoneE164(p,locale)`, `maskPhone(p)`→`+962 7X* *** XXXX`, `formatBookingReference(ref)`→`DV XXXXX`, `formatDurationMMSS(s,arabic?)`, `formatNumber(n,arabic?)`. Use locale `ar-JO-u-nu-arab` for Arabic‑Indic digits; default tz `Asia/Amman`. Identifiers (phone, booking ref) always render Western digits and stay `dir`‑safe.
- Root barrel `packages/shared/index.ts`: `export * from "./i18n"; export * from "./theme"; export * from "./lib/utils"; export { sendMagicLink } from "./lib/supabase-auth"; export * from "./ui";` Also export `cn(...)` (className joiner) and `formatDateTime/formatDuration/DEFAULT_TIMEZONE` from `lib/utils`.

---

## 6. Supabase data layer

**Env vars** (`.env.local`, gitignored): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `DEFAULT_TIMEZONE=Asia/Amman`, `DEFAULT_LOCALE=ar`, `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`, `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`. `.env.example` lists non‑secret keys.

**Schema** (`supabase/migrations/0001..0006.sql`, idempotent `create … if not exists`, all timestamps `timestamptz` UTC, rendered in Asia/Amman). Tables:
- **Reference (0001):** `facilities` (code, name_ar/en, city, country=JO, services text[], active), `facility_hours` (day_of_week 0=Sun..6=Sat, opens/closes, is_closed), `facility_holidays`, **`specialties`** (code, name_ar/en, **`color_hex`** ← drives dashboard specialty colors, active), `chief_complaint_patterns` (pg_trgm GIN for triage), `visit_types` (code, name_ar/en, default_duration_minutes, specialty_id), `slot_templates`, `slot_overrides`. Extensions `pgcrypto`, `pg_trgm`. Shared `tg_set_updated_at()` trigger.
- **Operational (0002):** `patients` (mrn, national_id_hash [hash only], names, dob, phone_e164 unique, language, is_minor, guardian_patient_id self‑FK), `visits` (**`booking_reference` `DV-XXXXX` unique**, patient/facility/specialty/visit_type FKs, scheduled_start/end, `status ∈ {scheduled,checked_in,in_room,discharged,cancelled,no_show}`, is_follow_up), `visit_intake` (1:1, `chief_complaint` NOT NULL, suggested_specialty_id, `picked_by ∈ {patient,bot_suggestion,staff_override}`).
- **Telemetry (0003):** `conversations` (started/ended_at, caller_phone, patient_id, elevenlabs_conversation_id unique, `outcome ∈ {completed_automated,completed_with_handover,abandoned,error}`, language), `turns` (turn_index, `speaker ∈ {agent,user}`, text_raw/normalized, intent), `tool_calls` (tool_name, request/response jsonb, ok, error_code, latency_ms), `handovers` (1:1, `reason_code ∈ {consent_declined,out_of_scope,customer_request,low_confidence,repeated_failure,patient_not_found,safety,specialty_unclear}`, summary_ar, customer_data jsonb, target_agent_id, triggered_at, completed_at), `outcomes` (1:1, `use_case ∈ {UC-D1..UC-D4}`, goal_achieved, `ces 1..10`, ces_declined), `customer_feedback`.
- **Governance (0004):** `admin_users` (email, full_name, role, active), `safety_events` (audit‑only — **never** shown in UI).
- **Indexes + RLS (0005):** admins (logged‑in) can read; service role bypasses RLS for server queries.
- **Realtime (0006):** publication for INSERTs on `conversations`, `turns`, `handovers`.
Provide `supabase/seed.sql` seeding the single facility (`dawood_main`), the 7 specialties with distinct `color_hex`, visit_types, hours, and a handful of demo patients/visits/conversations so the dashboard has data on first run.

**Clients (`apps/dashboard/lib`):**
- `supabase-server.ts`: `getSupabaseServer()` (cookie‑bound anon, for RSC) and `getSupabaseService()` (service role; **server‑only**, imports `next/headers`; used by ALL queries; `auth:{persistSession:false,autoRefreshToken:false}`).
- `supabase.ts` (`"use client"`): `getSupabaseBrowser()` memoised browser client. **HARDEN IT:** if `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` are empty, `console.warn` once and return a **no‑op channel stub** (`channel()→{on:()=>ch,subscribe:()=>ch,unsubscribe:()=>Promise.resolve()}`, `removeChannel:()=>Promise.resolve()`) instead of letting `createBrowserClient("","")` throw — otherwise a realtime effect crashes the whole page when env is missing.
- `realtime.ts` (`"use client"`): `subscribeToCalls(onInsert)`, `subscribeToTurns(conversationId,onInsert)`, `subscribeToHandovers(onInsert)` → each opens a channel, fires on INSERT, returns an unsubscribe fn.
- `queries.ts` (server‑only, service client). Implement and **keep these exact return shapes** (the UI destructures them): `listConversations(filters)→ConversationListItem[]` (joins outcomes+turns count; masks phone), `getConversation(id)`, `getConversationTranscript(id)→Turn[]`, `getConversationToolCalls(id)→ToolCall[]`, `listVisits(filters)→VisitListItem[]`, `getVisit(id)`, `listHandovers(filters)→HandoverDetail[]`, `getHandover(id)`, `getFacility()`, `listAdminUsers()`, `listSpecialties()→{id,code,name_ar,name_en,color_hex}[]`, `countVisits(filters)`, `getLiveCounters()→{calls_today,contained_pct,handovers_today,ces_avg_today}`, `getLatestConversations(limit)`, `getUCAutomationData()→{use_case,total,automated,automation_pct}[]`, `getActivityFeed(limit)→{id,kind:'tool_call'|'handover'|'visit_booked',happened_at,label_ar,link_to}[]`, `getSidebarStats()→{visits_total,visits_today,patients_total,specialties_active,handovers_open,conversations_total}`, `getVisitsTrend(days=7)→{date,count}[]` (zero‑filled), `getSpecialtyBreakdown()→{name_ar,color_hex,count}[]`, `getStatusBreakdown()→{status,count}[]`. Helpers: `ammanDayStart(now?)` (UTC instant of 00:00 Asia/Amman, UTC+3 no DST), `maskPhone`, `durationSeconds`. `kpis.ts`: containment %, CES avg, no‑show rate.

---

## 7. (call app first screen of value) — `apps/call`  ★ crown jewel

`app/layout.tsx`: `<html dir="rtl" lang="ar" data-theme="light" suppressHydrationWarning>` wrapping `ThemeProvider > LanguageProvider`. `globals.css` imports the three shared stylesheets + Google Fonts, sets `.call-bg` (a dawn backdrop: teal overhead + gold upper glow + low teal wash + grain, fixed) and the **orb + skyline** CSS.

`app/page.tsx` composes (a calm, centered column over `.call-bg` with the skyline grounded at the bottom):
- **`HeroCopy`** — `.t-eyebrow` ("Salma · Voice Assistant" w/ live ping), `.t-display-xl` title (`callPage_title`), a gold `VitalLine mode="draw"` underline flourish, subtitle.
- **`ConsentBanner`** — soft `accent-soft`/hairline pill with a `MedicalGlyph` info icon, `consent_banner` + `consent_learn_more` → `/privacy`.
- **`CallStage`** (`"use client"`) — hosts ElevenLabs `ConversationProvider`, lifts transcript state, renders the orb + `TranscriptStream`. Glass `backdrop-blur` frame with a gold hairline crown.
- **`CallOrb`** (`"use client"`) — the voice button/visualizer. Uses `useConversation({ connectionType:"websocket", onConnect/onMessage/onError })`. States via `[data-state]` (`idle|connecting|listening|speaking|error`) drive CSS: layered `orb-aura/ring/halo/orbit/shimmer/core`, breathing, ripples, rotating halos, an equalizer while speaking, a connecting spinner, and an error flash. Mic‑permission check; mute/end controls when connected. Dynamic hint text per state (`callOrb_*`). Reads agent id from `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` (empty → clean error). `buildDynamicVariables({language,now,tz})` passes `current_date_info` + `language` at `startSession`.
- **`TranscriptStream`** — RTL‑aware bubbles (agent on start, caller on end), `.t-body-sm`, surface/accent tones, autoscroll, empty state `transcript_empty`.
- **`TrustCards`** — 3 cards (privacy/availability/languages) each `shadow-card` + inset highlight + a `MedicalGlyph` (shield/clock/globe), staggered `delay-*`, hover lift.
- **Hospital skyline backdrop** — a calm medical‑campus silhouette along the bottom: ground haze, faint medical‑cross lattice, twinkling window dot‑grid, a glowing rooftop cross, and one animated EKG line. **CSS + inline data‑URI SVG masks painted by `currentColor`** (all color from tokens; works light+dark). `lib/elevenlabs.ts` centralizes connection type + agent id + dynamic vars; `lib/date-context.ts` builds the Arabic date string.

---

## 8. Dashboard — `apps/dashboard`

`app/layout.tsx`: same provider stack + html attributes. `app/(app)/layout.tsx` (server, `force-dynamic`): fetches `getSidebarStats()`, renders `<DashboardShell stats={…}>`. `middleware.ts` is a no‑op pass‑through for the POC (structure auth so it can be enabled later; magic‑link login exists).

**Shell** — `DashboardShell` (`"use client"`, owns drawer open‑state): fixed `Sidebar` (md+) / drawer (mobile) + a sticky top bar (`backdrop-blur`, bottom hairline, faint `--gradient-mesh` wash, a mobile menu button + mobile page title, and `LanguageToggle`+`ThemeToggle` pinned with `ms-auto`). Main content wrapped `max-w-[1400px] mx-auto`, padding `p-5 md:p-10`. **`Sidebar`**: brand emblem (`MedicalGlyph cross` tile + gold dot), nav under a `.t-eyebrow` "Navigation" label with a **gold active rail** on the inline‑start edge + filled accent state + calm `surface-2` hover, then a **pulse well** (`surface-3` + hairline) featuring "visits today" crowned by a `VitalLine static`, then stat rows (use `chart-2` for the cyan), then a live system‑ok footer. Keep `w-64`, `border-e`, the `md:!static md:!translate-x-0` + `ltr:-translate-x-full rtl:translate-x-full` drawer rules (load‑bearing for RTL), and all `stats.*` fields.

**Routes:** `/` overview, `/calls` list, `/calls/[id]` detail, `/visits`, `/handovers`, `/settings`, `/login` (outside the shell), `/auth/callback`. Every data page sets `export const dynamic = "force-dynamic"`.

**Reusable components** (`components/**`) — all adopt: `shadow-card` + an inset top‑highlight span (`style={{boxShadow:"var(--highlight-top)"}}`), `.t-eyebrow` labels, `.t-numeral` metrics, `border-hairline` separators, `focus-visible:ring-2 focus-visible:ring-ring` on controls, and `MedicalGlyph`/`SpecialtyGlyph` icons:
- `editorial/BigNumber` — large metric "vital" card: glyph chip (ring), `.t-eyebrow` label, `.t-numeral` value + unit, delta chip, and a footline micro‑viz (`meter` fill / `scale` segments / `live` pulse), top accent rail + corner glow + entrance `sheen`, optional `motif` watermark. `editorial/Stat` — compact stat w/ progress + trend. `editorial/PageHeader` — `.t-display-md` title + optional `kickerKey` (gold tick + eyebrow) + subtitle + actions slot + dual‑hairline rule. `editorial/SectionTitle` (`.t-eyebrow`). `editorial/EmptyState` — optional `variant` → `EmptyArt` illustration + message + CTA. `editorial/RefreshButton` (`useTransition`+`router.refresh()`, spinning glyph). `editorial/RuleLine` (`tone` hairline/border).
- `charts/ChartCard` (titled panel, accent rail, glow, hover lift), `charts/Donut` (SVG ring + center `.t-numeral` total + legend w/ share% & count; track = hairline), `charts/TrendBars` (gradient columns + traced sparkline + area fill + floating value labels + localized weekday/day axis), `charts/SpecialtyBars` (ranked horizontal bars painted with DB `color_hex` + a `SpecialtyGlyph`).
- `ConversationsTable` / `VisitsTable` / `handovers/_components/HandoversTable` — `surface-3` header well, `.t-eyebrow` column labels, hairline rows, refined status/outcome **pills**, hover `surface-2`; live‑highlight new rows; HandoversTable has expandable `customer_data` + realtime. `Pagination` (URL searchParam; `.t-numeral` page). `filters/FilterControls` — `useFilters()` URL hook + `FilterBar/FSelect/FDate/FText/FMultiChips`; bar `surface-2`+hairline+`shadow-card`; inputs focus‑ring; chips as pills (selected = `bg-accent text-white`).
- `_overview/OverviewMasthead` (`.t-display-lg` title, gold kicker, **`VitalLine` underline**, live badge, RefreshButton), `_overview/OverviewSection` (index `.t-numeral` + `.t-eyebrow` title + gradient hairline), `_overview/ActivityFeedView` (connected timeline: colored `MedicalGlyph` nodes on a rail + cards w/ `.t-eyebrow` kind tag + faint timestamp; live `subscribeToHandovers`; 20‑item cap), plus the server sections `LiveCounters`/`LiveCallsCounter`(realtime)/`OverviewCharts`/`UCAutomationTiles`/`LatestConversations`/`ActivityFeed`.

**Per‑page composition:**
- **Overview** (`(app)/page.tsx`, server, `force-dynamic`): `OverviewMasthead` (date pre‑formatted server‑side per language) then `<Suspense>`‑wrapped sections (vitals → charts → automation → a wide call‑log / narrow activity‑rail split). Skeletons = `bg-surface` + `animate-shimmer` + a faint `VitalLine`.
- **Calls** — `PageHeader kicker_calls`/`calls_page_sub`, FilterControls, `CallsTableLive` (realtime), Pagination, `EmptyState variant="calls"`.
- **Call detail** — a two‑column **"case file"**: transcript hero (`surface`/`surface-3` well, live `subscribeToTurns` + autoscroll, agent/caller bubbles, `EmptyState variant="transcript"`) + a metadata rail (outcome/CES/handover/language/goal as a `.t-eyebrow` definition list + status chips) + expandable tool‑call JSON on `surface-3`.
- **Visits** — `PageHeader kicker_visits`, 3 KPI `Stat` cards (today / next‑7 / no‑show%), filters, `VisitsTable`, `EmptyState variant="visits"`.
- **Handovers** — `PageHeader kicker_handovers`, filters (reason multi‑chips + status), `HandoversTable`, `EmptyState variant="handovers"`.
- **Settings** — read‑only cards (facility / retention / admins) each a `.t-eyebrow` group label + `MedicalGlyph`; facility as a definition list; admins as a refined table; keep the legal‑review note.
- **Login** (outside shell) — centered `surface` card with `shadow-pop` on a `GradientMesh` backdrop + a faint `SectionMotif`, the Dawood emblem, `.t-display-md` title, magic‑link form (email + submit, focus rings), and the `SignedOutBanner` for `not_authorized`/`invalid_link`. Uses `sendMagicLink` from `@dawood/shared`.

---

## 9. Quality bar & "must not break" rules

- All four of `npm run typecheck`, `npm run lint`, `npm run build` (per app) must be **green**.
- Verify visually with **headless Chrome** across **light/dark × ar/en** for: call `/`; dashboard `/`, `/calls`, `/calls/[id]`, `/visits`, `/handovers`, `/settings`, `/login`. Assert no error boundary, real content present, `dir`/`lang` correct, no physical left/right regressions, `.t-eyebrow` uppercases only in EN.
- Realtime: inserting `conversations`/`handovers` rows live‑updates the counters/feeds; a live call appends transcript turns. With env missing, the hardened browser client keeps pages rendering (no crash).
- Preserve: server/client split, `force-dynamic`, `<Suspense>` slots, query return shapes, provider order, `html dir/lang`, RTL logical properties, reduced‑motion guards, focus‑visible rings. **Never** slash‑opacity on token colors. Gold stays a signature accent only.

## 10. Acceptance checklist (Definition of Done)
☐ Monorepo runs with one `npm run dev` (call 3020, dashboard 3021). ☐ Tokens/preset/type/animations/graphics exactly as specified; light+dark both polished. ☐ i18n ar/en parity compile‑asserted; toggles flip content + `dir`/`lang`; Arabic‑Indic digits. ☐ Supabase schema + seed; queries typed; browser client hardened; realtime live. ☐ Call orb connects to ElevenLabs (websocket) and streams transcript; skyline + VitalLine present. ☐ All 7 dashboard routes built to the Clinical Atelier bar. ☐ typecheck + lint + build green; screenshot matrix reviewed. 

> Build phase‑by‑phase, verifying after each. Prioritize the design system and a single beautiful screen (the overview) before breadth — the bar is "premium, modern, unmistakably medical, and unmistakably *crafted*."
