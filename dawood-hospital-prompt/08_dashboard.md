<!-- Dawood Hospital simplification of hospitals/08a_dashboard_core.md + hospitals/08b_dashboard_pages.md
     drops: /agent-versions, /agent-actions, /safety (page), /conversation-flows, /kpis (folded into overview),
            /facilities list (single facility), 12-item sidebar → 5-item, KPI materialised views,
            Sankey diagram, bulk-acknowledge safety UX, agent version diff, charting libraries (@nivo/sankey),
            facility detail page, mock-vs-live integration toggle
     adds: merged two-phase prompt (Phase A: shell+auth+overview, Phase B: 4 pages),
           single-facility readout in /settings, specialty filter on /visits,
           count-based KPI aggregates in lib/kpis.ts -->

# STEP 08 — Dashboard (shell, auth, overview, and 4 detail pages)

> Prerequisites: steps 01–07 complete. Supabase migrations applied,
> seed loaded, ElevenLabs + n8n configured, `apps/call` serves on 3018.
>
> Scope: implement all of `apps/dashboard/` — Supabase clients, Magic
> Link auth, query library, count-based KPI helpers, realtime helpers,
> editorial design system, and **5 pages**: `/`, `/calls` + `/calls/[id]`,
> `/visits`, `/handovers`, `/settings`.
>
> This prompt merges what the full hospitals/ pack split into 08a + 08b.
> It is organised into **TWO PHASES** with a mid-prompt checkpoint.
> **STOP at the Phase A checkpoint**, report back, wait for human
> confirmation, then continue Phase B in the same conversation. Do not
> race through both phases.

---

## File map (both phases)

```
apps/dashboard/
├── app/
│   ├── layout.tsx                  (RTL + providers + sidebar shell)
│   ├── page.tsx                    (the / overview page)
│   ├── loading.tsx
│   ├── globals.css
│   ├── login/page.tsx              (Magic Link request)
│   ├── auth/callback/route.ts      (Magic Link callback)
│   ├── _overview/
│   │   ├── LiveCounters.tsx
│   │   ├── LatestConversations.tsx
│   │   ├── UCAutomationTiles.tsx
│   │   └── ActivityFeed.tsx
│   ├── calls/
│   │   ├── page.tsx                (list + filters)
│   │   ├── _components/CallsFilters.tsx
│   │   └── [id]/page.tsx           (transcript + tool timeline + outcome)
│   ├── visits/
│   │   ├── page.tsx                (filter by specialty / status / date)
│   │   └── _components/VisitsFilters.tsx
│   ├── handovers/
│   │   ├── page.tsx                (reason chips + Arabic summaries)
│   │   └── _components/HandoversFilters.tsx
│   └── settings/
│       └── page.tsx                (admin / facility / retention readout)
├── components/
│   ├── Sidebar.tsx                 (5-item nav, RTL-aware)
│   ├── editorial/
│   │   ├── PageHeader.tsx
│   │   ├── BigNumber.tsx
│   │   ├── RuleLine.tsx
│   │   ├── Stat.tsx
│   │   ├── RefreshButton.tsx
│   │   └── EmptyState.tsx
│   └── auth/
│       ├── SignedOutBanner.tsx
│       └── UserMenu.tsx
├── lib/
│   ├── supabase.ts                 (anon client, browser-safe)
│   ├── supabase-server.ts          (server / service client)
│   ├── auth.ts                     (Magic Link + requireAuth)
│   ├── queries.ts                  (data layer — ~400 LOC total)
│   ├── kpis.ts                     (count-based aggregates only)
│   ├── realtime.ts                 (Supabase channel helpers)
│   └── format.ts                   (Arabic date/phone/number formatting)
├── middleware.ts                   (auth gate)
└── .env.example                    (verify keys from step 02)
```

`.env.example` must have `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

---

# PHASE A — Shell + auth + queries + overview

Produce in this order. Do not jump to Phase B until you print the
Phase A checkpoint and the human approves.

## A.1 — Supabase clients

Use `@supabase/ssr` (current recommendation). Install if missing —
the ONLY new dependency Phase A may introduce.

- `lib/supabase.ts` exports `getSupabaseBrowser()` via
  `createBrowserClient` (anon key).
- `lib/supabase-server.ts` exports `getSupabaseServer()` (session-bound
  via `cookies()`) and `getSupabaseService()` (service-role; bypasses
  RLS; **never** imported from a client component).

## A.2 — Auth (`lib/auth.ts`)

```ts
export async function sendMagicLink(email: string, origin: string): Promise<void>;

export async function requireAuth(): Promise<{ user: User; adminUser: AdminUser }> {
  const supabase = getSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const service = getSupabaseService();
  const { data: admin } = await service.from("admin_users")
    .select("id, email, role, active")
    .eq("email", session.user.email).eq("active", true).single();
  if (!admin) redirect("/login?error=not_authorized");
  return { user: session.user, adminUser: admin };
}
```

`redirect()` throws — do NOT wrap in try/catch. `/login` and
`/auth/callback` do NOT call `requireAuth()`.

## A.3 — Middleware (`middleware.ts`)

Public paths bypass: `/login`, `/auth/callback`. Otherwise build a
request-scoped server client (with `cookies.get/set/remove` plumbed
through `req` + `res`), call `getSession()`, and redirect to
`/login` if absent. Matcher:
`["/((?!_next/static|_next/image|favicon|api/public).*)"]`.

## A.4 — Login + callback

`app/login/page.tsx` (client component): email input + "أرسلوا الرابط"
button → calls `sendMagicLink(email, window.location.origin)`. Shows
"تم إرسال الرابط — تحققوا من بريدكم". Reads `?error=` and surfaces:
- `not_authorized` → "غير مصرح لهذا البريد بالدخول إلى لوحة التحكم."
- `invalid_link` → "الرابط غير صالح أو منتهي الصلاحية."

`app/auth/callback/route.ts` (server route): reads `code` query param,
calls `exchangeCodeForSession(code)`. Success → `redirect("/")`.
Failure → `redirect("/login?error=invalid_link")`.

## A.5 — Editorial design system (`components/editorial/*`)

Editorial aesthetic: monochrome, big numerals, rule lines, breath,
one accent from `@dawood/shared/styles/tokens.css`. Never hardcode hex.

- `PageHeader.tsx` — title + optional subtitle + right-aligned
  actions; thin `RuleLine` below.
- `BigNumber.tsx` — large numeral with optional unit and delta;
  Arabic-Indic digits when `lang === "ar"`.
- `RuleLine.tsx` — themed `<hr>`, full width.
- `Stat.tsx` — label + value + optional sub-label, compact card.
- `RefreshButton.tsx` — client component; `useRouter().refresh()`
  with spinning icon while pending.
- `EmptyState.tsx` — thin SVG glyph + Arabic text + optional CTA.

All are server-component friendly except `RefreshButton`.

## A.6 — Sidebar (`components/Sidebar.tsx`)

5 nav items. Sidebar on the right in Arabic, left in English; flip via
`dir` + `flex-row-reverse`, never hardcode either side.

| Route        | i18n key         | Icon            |
|--------------|------------------|------------------|
| `/`          | `nav_overview`   | layout-grid     |
| `/calls`     | `nav_calls`      | phone-call      |
| `/visits`    | `nav_visits`     | calendar-check  |
| `/handovers` | `nav_handovers`  | user-round-pen  |
| `/settings`  | `nav_settings`   | settings        |

Footer slot: language toggle + theme toggle + `<UserMenu />` (email
truncated to local-part on narrow widths + "تسجيل الخروج" action).

On mobile (`< md`), collapses into a drawer triggered by a hamburger.

## A.7 — Auth components (`components/auth/*`)

- `SignedOutBanner.tsx` — server, shown on `/login` via redirect;
  reads `?error=` and surfaces it.
- `UserMenu.tsx` — client; signed-in email + sign-out → routes to
  `/login`.

## A.8 — Queries (`lib/queries.ts`)

Target: **~400 LOC total** across both phases. Prefer narrow row
interfaces over Supabase's generated types. All queries go through
`getSupabaseService()` (server-only admin reads).

Provide signatures + types; write bodies in code. Group A–D in
Phase A; Group E (overview aggregates) closes Phase A.

### Group A — Conversations (consumed by `/calls`, `/calls/[id]`)

```ts
export type ConversationListItem = {
  id: string;
  started_at: string;
  ended_at: string | null;
  caller_phone_masked: string;        // "+9627****1234"
  duration_seconds: number | null;
  outcome: string | null;             // 'completed_automated' | ...
  use_case: string | null;            // 'UC-D1' .. 'UC-D4'
  ces_score: number | null;
  turn_count: number;
};

export type ConversationDetail = ConversationListItem & {
  patient_id: string | null;
  language: string;                   // 'ar' | 'en'
  raw_metadata: Record<string, unknown>;
};

export type Turn = { id: string; role: 'agent' | 'user'; content_ar: string; spoken_at: string };

export type ToolCall = {
  id: string; tool_name: string; called_at: string;
  ok: boolean; error_code: string | null;
  request_json: unknown; response_json: unknown;
  duration_ms: number | null;
};

export async function listConversations(filters: {
  from?: Date; to?: Date; outcome?: string; useCase?: string;
  phoneLast4?: string; limit?: number; offset?: number;
}): Promise<ConversationListItem[]>;
export async function getConversation(id: string): Promise<ConversationDetail | null>;
export async function getConversationTranscript(id: string): Promise<Turn[]>;
export async function getConversationToolCalls(id: string): Promise<ToolCall[]>;
```

### Group B — Visits (consumed by `/visits`)

```ts
export type VisitListItem = {
  id: string; booking_reference: string;
  scheduled_start: string;            // ISO Asia/Amman
  specialty_id: string; specialty_name_ar: string;
  visit_type: string;
  patient_id: string; patient_phone_masked: string;
  status: 'scheduled'|'checked_in'|'in_room'|'discharged'|'cancelled'|'no_show';
  created_at: string;
};
export type VisitDetail = VisitListItem & {
  chief_complaint: string | null;
  suggested_specialty_id: string | null;
  notes_internal: string | null;
};

export async function listVisits(filters: {
  status?: string[]; specialtyId?: string;
  from?: Date; to?: Date; phoneLast4?: string;
  limit?: number; offset?: number;
}): Promise<VisitListItem[]>;
export async function getVisit(id: string): Promise<VisitDetail | null>;
```

### Group C — Handovers (consumed by `/handovers`)

```ts
export type HandoverListItem = {
  id: string; triggered_at: string; conversation_id: string;
  reason_code: string; summary_ar: string;
  target_agent_id: string;
  status: 'open' | 'completed'; completed_at: string | null;
};
export type HandoverDetail = HandoverListItem & {
  customer_data: Record<string, unknown>;
};

export async function listHandovers(filters: {
  reasonCode?: string[]; status?: 'open' | 'completed';
  from?: Date; to?: Date; limit?: number; offset?: number;
}): Promise<HandoverListItem[]>;
export async function getHandover(id: string): Promise<HandoverDetail | null>;
```

### Group D — Facility (single row — Dawood)

```ts
export type FacilityRow = {
  id: string; code: string;           // 'DAWOOD-MAIN'
  name_ar: string; name_en: string;
  city: string; timezone: string;     // 'Asia/Amman'
};
// Returns the single Dawood row; no list helper because there is no list.
export async function getFacility(): Promise<FacilityRow>;
```

### Group E — Overview aggregates (consumed by `app/page.tsx`)

```ts
export type LiveCounters = {
  calls_today: number; contained_pct: number;       // 0..100
  handovers_today: number; ces_avg_today: number | null;
};
export type UCAutomationRow = {
  use_case: 'UC-D1' | 'UC-D2' | 'UC-D3' | 'UC-D4';
  total: number; automated: number; automation_pct: number;
};
export type ActivityFeedItem = {
  id: string; kind: 'tool_call' | 'handover' | 'visit_booked';
  happened_at: string; label_ar: string; link_to: string | null;
};

export async function getLiveCounters(): Promise<LiveCounters>;
export async function getLatestConversations(limit: number): Promise<ConversationListItem[]>;
export async function getUCAutomationData(): Promise<UCAutomationRow[]>;
export async function getActivityFeed(limit: number): Promise<ActivityFeedItem[]>;
```

## A.9 — KPI helpers (`lib/kpis.ts`)

The full hospitals/ pack used materialised views (migration 0007).
Dawood dropped those views in step 03. `lib/kpis.ts` implements
KPIs **directly via `count()` / `avg()` on raw tables**. Small
bodies; consumed by `getLiveCounters()` and `getUCAutomationData()`.

```ts
export async function kpiContainment(from: Date, to: Date): Promise<number>;
export async function kpiCESAvg(from: Date, to: Date, useCase?: string): Promise<number | null>;
export async function kpiCESCapture(from: Date, to: Date): Promise<number>;
export async function kpiHandoverRate(from: Date, to: Date): Promise<number>;
export async function kpiNoShowRate(days: number): Promise<number>;
export async function kpiPerUCAutomation(from: Date, to: Date): Promise<{
  use_case: string; total: number; automated: number; pct: number;
}[]>;
```

**No `/kpis` page exists** — KPIs surface inside the overview tiles.

## A.10 — Realtime (`lib/realtime.ts`)

Three channels (publication added in migration 0006): `calls`,
`turns`, `handovers`. Each opens a Supabase channel, fires the
callback on `INSERT`, returns an unsubscribe function.

```ts
export function subscribeToCalls(onInsert: (row: { id: string; started_at: string }) => void): () => void;
export function subscribeToTurns(conversationId: string, onInsert: (row: Turn) => void): () => void;
export function subscribeToHandovers(onInsert: (row: { id: string; triggered_at: string; reason_code: string }) => void): () => void;
```

Use `getSupabaseBrowser()` (these run in client components). There
is NO `subscribeToSafetyEvents` — Dawood writes safety events for
audit but does not display them.

## A.11 — Formatters (`lib/format.ts`)

```ts
export function formatArabicDate(d: Date, tz?: string): string;
export function formatArabicTime(d: Date, tz?: string): string;
export function formatArabicDateTime(d: Date, tz?: string): string;
export function formatPhoneE164(p: string, locale: 'ar' | 'en'): string;
export function maskPhone(p: string): string;                  // "+962 79* *** 4567"
export function formatBookingReference(ref: string): string;   // "DH 2026 001234"
export function toArabicIndicDigits(s: string): string;
```

Default tz: `process.env.DEFAULT_TIMEZONE || "Asia/Amman"`. Use
`Intl.DateTimeFormat("ar-JO", { timeZone, ... })` (Node 20+ ICU).

## A.12 — Root layout (`app/layout.tsx`)

```tsx
import { LanguageProvider } from "@dawood/shared/i18n";
import { ThemeProvider } from "@dawood/shared/theme";
import { Sidebar } from "@/components/Sidebar";
import { requireAuth } from "@/lib/auth";
import "./globals.css";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, adminUser } = await requireAuth();
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <LanguageProvider defaultLanguage="ar">
            <div className="flex min-h-screen">
              <Sidebar user={user} adminUser={adminUser} />
              <main className="flex-1 p-6 md:p-10">{children}</main>
            </div>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

`/login` and `/auth/callback` live OUTSIDE this layout — use a Next.js
route group (`app/(public)/login/...`) or a sibling layout that
omits `requireAuth()`.

## A.13 — Overview (`app/page.tsx` + `app/_overview/*`)

```
┌────────────────────────────────────────────────────────────────┐
│  [PageHeader: نظرة عامة + RefreshButton]                       │
│  ──────────────────────────────────────────────────────────    │
│  [LiveCounters: calls_today, contained_pct, handovers, CES]    │
│  [UCAutomationTiles: 2×2 grid, UC-D1..D4 with %]              │
│  [LatestConversations: 10 most-recent → /calls/[id]]          │
│  [ActivityFeed: tool_call + handover + visit_booked stream]    │
└────────────────────────────────────────────────────────────────┘
```

`_overview/*` are RSCs calling `queries.ts` directly:

- `LiveCounters.tsx` — 4 `<BigNumber>` blocks (wraps on narrow
  widths). Wraps a tiny client island subscribed to
  `subscribeToCalls` to bump `calls_today` on inserts.
- `UCAutomationTiles.tsx` — 4 `<Stat>` cards in a 2×2 grid:
  UC-D1 (FAQ), UC-D2 (booking+triage), UC-D3 (reschedule/cancel/
  status), UC-D4 (multi-intent). Show automation %, total count,
  small "↑/↓" trend chip vs prior 7-day window.
- `LatestConversations.tsx` — table of 10 most-recent. Columns:
  started_at (Arabic), masked phone, duration, outcome chip, UC
  chip. Row click → `/calls/[id]`.
- `ActivityFeed.tsx` — vertical timeline of last 20 items, each
  Arabic-labeled. Wraps a client sub-component subscribed to
  `subscribeToHandovers` to prepend new handovers live.

Set `export const dynamic = "force-dynamic"` so RSCs re-query on
every visit.

---

## Phase A CHECKPOINT — STOP HERE before Phase B

When Phase A is complete, print:

1. Tree of `apps/dashboard/` (every file created so far).
2. i18n keys added in Phase A (both `ar` and `en`).
3. Output of `npm run dev:dashboard` for 5 seconds, then SIGINT.
4. Confirmation that: dev server starts on 3019; `/` redirects to
   `/login` when signed out; submitting a known-good admin email
   sends a Magic Link (or prints to terminal in Supabase local
   mode); clicking it lands on `/`; the four overview sections
   render seed data; the sidebar shows 5 items in order
   (Overview → Calls → Visits → Handovers → Settings) with Arabic
   labels on the right.
5. Anything simplified or skipped.

Then **STOP and wait for me to confirm** before starting Phase B.

---

# PHASE B — The 4 remaining pages

After Phase A is approved, produce the pages **one at a time, in
this order**, printing a small checkpoint between each (file path
+ row count of seed data the page shows):

1. `app/calls/page.tsx` + `_components/CallsFilters.tsx`
2. `app/calls/[id]/page.tsx`
3. `app/visits/page.tsx` + `_components/VisitsFilters.tsx`
4. `app/handovers/page.tsx` + `_components/HandoversFilters.tsx`
5. `app/settings/page.tsx`

If `lib/queries.ts` is missing a helper a page needs, **add it
there** — do not inline a one-off query.

## B.1 — `/calls`

`PageHeader` + filter bar (client) + paginated table.

Filter bar (`_components/CallsFilters.tsx`):
- Date range (default: last 24h).
- Outcome dropdown: `completed_automated`,
  `completed_with_handover`, `abandoned`, `error`, "الكل".
- Use-case dropdown: UC-D1, UC-D2, UC-D3, UC-D4, "الكل".
- Phone search (last 4 digits; Arabic-Indic input accepted, normalise).
- "مسح الفلاتر" reset.

Filters update `searchParams` (`?from=…&to=…&uc=…&outcome=…&phone=…`);
page reads them and feeds `listConversations(...)`.

Columns: started_at (Arabic), masked phone, duration (mm:ss),
outcome chip, UC chip, CES chip (if any), turns. Default sort:
most-recent first. Page size: **25**. Row click → `/calls/[id]`.

Realtime: a client island subscribed via `subscribeToCalls` prepends
new rows with a soft highlight that fades over ~2s.

Empty: "لا توجد مكالمات تطابق الفلاتر الحالية."

## B.2 — `/calls/[id]`

```
┌──────────────────────────────────────────────────────────────┐
│  [PageHeader: رقم المكالمة + status chip + RefreshButton]   │
│  [Meta strip: started_at, duration, masked phone,            │
│   patient link → /visits?phoneLast4=…, language]            │
│  ┌────────────────────────┐  ┌─────────────────────────────┐ │
│  │ Transcript (chat)      │  │ Tool calls timeline         │ │
│  │ — bubbles by turn      │  │ — collapsible cards         │ │
│  │ — agent right, user left│ │ — request + response JSON   │ │
│  │   (Arabic RTL)         │  │ — color-coded ok/error      │ │
│  └────────────────────────┘  └─────────────────────────────┘ │
│  [Outcome card: use_case, goal_achieved, CES (or "declined"),│
│   handover (if any) with summary_ar + reason_code]           │
└──────────────────────────────────────────────────────────────┘
```

Data: `getConversation(id)`, `getConversationTranscript(id)`,
`getConversationToolCalls(id)`. Join the handover row in
`getConversation` rather than a separate roundtrip.

Realtime: if `ended_at IS NULL`, wrap transcript in a client
component subscribed to `subscribeToTurns(id, ...)` and append at
the bottom.

If `getConversation(id)` returns `null`, render a friendly Arabic
"المكالمة غير موجودة" inside the layout — do NOT throw a 404.

Empty states: "لم تُسجَّل أي حوارات." / "لم يستدعِ المساعد أي أدوات."

## B.3 — `/visits`

`PageHeader` + filter bar + KPI strip + table.

Filter bar (`_components/VisitsFilters.tsx`):
- **Specialty dropdown** — the 7 Dawood specialties (cardiology,
  ENT, internal medicine, ophthalmology, pediatrics, dentistry,
  dermatology), labels in Arabic from the seed.
- Status multi-select: scheduled, checked_in, in_room, discharged,
  cancelled, no_show.
- Date range (default: next 7 days).
- Patient phone search (last 4).
- "مسح الفلاتر" reset.

KPI strip above table — three `<Stat>` cards:
- "زيارات اليوم" (count from `listVisits` today range).
- "خلال السبعة أيام القادمة" (count from `listVisits` next 7).
- "نسبة عدم الحضور — 30 يوم" (% from `kpiNoShowRate(30)`).

Columns: booking_reference (formatted), scheduled_start (Arabic
date+time), specialty (Arabic), visit_type, patient (masked phone),
status chip, created_at. Sort: scheduled_start asc for upcoming,
desc for past. Page size: **25**.

There is **no `/visits/[id]` page** in this pack — `VisitDetail`
exists in `queries.ts` for the step-09 verify script, but the
dashboard doesn't render it (drill-down is future work).

Empty: "لا توجد زيارات تطابق الفلاتر الحالية."

## B.4 — `/handovers`

`PageHeader` + filter bar + table.

Filter bar (`_components/HandoversFilters.tsx`):
- Reason-code multi-select chips — all codes from the system prompt
  + n8n `prepare_handover` workflow (out-of-scope, low-confidence,
  consent-declined, complex-clinical, language-other,
  repeat-failure, etc.).
- Status: open / completed / "الكل".
- Date range (default last 7 days).
- "مسح الفلاتر" reset.

Columns: triggered_at (Arabic), reason chip (color-coded by
category), summary_ar (truncated ~120 chars + tooltip for full
text), target_agent_id, completed_at. Sort: most-recent first.
Page size: **25**.

Row click → drawer / accordion showing full `customer_data` JSON
(pretty-printed monospace; keys English, values may be Arabic),
full `summary_ar`, link to source `/calls/{conversation_id}`.

Realtime: `subscribeToHandovers` prepends live with the same
fade-highlight pattern as `/calls`.

Empty: "لا توجد تحويلات في هذه النافذة الزمنية."

## B.5 — `/settings`

Strictly **read-only**. Three stacked sections, each a card:

1. **Admin users** — table from `admin_users`: email, role, active.
   Note below: "لإضافة مستخدمين جدد، تواصلوا مع مسؤول Supabase الخاص بكم."

2. **Facility info** — from `getFacility()`:
   - `name_ar` (large) with `name_en` smaller below
   - City (`'Amman'`), Timezone (`'Asia/Amman'`), Code (`'DAWOOD-MAIN'`)
   - The 7 specialties as a comma-separated Arabic list.

3. **Retention windows** — static read-only copy from the briefing:
   - "تسجيلات المكالمات: 12 شهراً"
   - "النصوص: 24 شهراً"
   - "سجل التدقيق: 7 سنوات (غير قابل للتعديل)"
   - Muted "REVIEW WITH LEGAL" footer: pending Jordan MoH review.

No env toggles, no mock-vs-live switch, no "reset KB" button.
Informational only.

---

## i18n additions (add all at once to `@dawood/shared/i18n/dictionary.ts`)

Both `ar` and `en` in parity. ~30 keys.

Navigation: `nav_overview`, `nav_calls`, `nav_visits`,
`nav_handovers`, `nav_settings`.

Overview: `overview_counter_calls_today`,
`overview_counter_containment`, `overview_counter_handovers_today`,
`overview_counter_ces_today`, `overview_uc_tiles_title`,
`overview_latest_conversations`, `overview_activity_feed`.

Calls: `calls_page_title`, `calls_filter_outcome`,
`calls_filter_use_case`, `calls_filter_phone`, `calls_filter_reset`,
`calls_col_started_at`, `calls_col_duration`, `calls_col_turns`,
`calls_empty`, `call_detail_transcript`, `call_detail_tools`,
`call_detail_outcome`, `call_detail_handover`,
`call_detail_not_found`.

Visits: `visits_page_title`, `visits_filter_specialty`,
`visits_filter_status`, `visits_kpi_today`, `visits_kpi_upcoming7`,
`visits_kpi_noshow30`, `visits_empty`.

Handovers: `handovers_page_title`, `handovers_filter_reason`,
`handovers_filter_status`, `handovers_col_summary`,
`handovers_empty`.

Settings: `settings_page_title`, `settings_admins`,
`settings_admins_invite_note`, `settings_facility`,
`settings_retention`, `settings_legal_review_note`.

Auth: `login_title`, `login_email_placeholder`, `login_send_link`,
`login_sent`, `login_invalid_link`, `login_not_authorized`,
`signout`.

Misc: `refresh`, `empty_state_generic`.

Sample translations (write these exactly; fill the rest in the
same register):
- `nav_overview`: "نظرة عامة" / "Overview"
- `visits_kpi_today`: "زيارات اليوم" / "Visits today"
- `handovers_empty`: "لا توجد تحويلات في هذه النافذة الزمنية." / "No handovers in this window."
- `login_not_authorized`: "غير مصرح لهذا البريد بالدخول." / "Email not authorized."

---

## Conventions (apply to every Phase B page)

- Default sort: **most-recent first**. Page size: **25**.
- All filter changes go through `searchParams` (shareable URLs).
- Use the editorial system uniformly: `PageHeader`, `BigNumber`,
  `RuleLine`, `Stat`, `EmptyState`.
- Every list has a friendly Arabic empty state.
- Heavy queries: server-render with `Suspense` boundaries;
  editorial `loading.tsx` skeleton.
- Errors: small Arabic banner per page (don't blow up the whole
  dashboard).
- Realtime client components only on `/`, `/calls`, `/calls/[id]`,
  `/handovers`.
- Filter UI lives in `_components/` subfolders of each route.

---

## Execution discipline (BOTH phases)

- Use `@supabase/ssr` (NOT legacy `@supabase/auth-helpers-*`).
- Do NOT add chart / Sankey / diagram libraries. KPIs are plain
  numbers; UC tiles render them as `<Stat>` cards. No `@nivo/sankey`,
  no Chart.js, no recharts.
- Prefer narrow row interfaces in `queries.ts` over Supabase
  generated types.
- Service-role client is server-only — never import
  `supabase-server.ts` from a client component.
- `requireAuth()` returns via `redirect()` (which throws) — no
  try/catch.
- `lib/queries.ts` budget: **~400 LOC total** across both phases.
  Hard cap ~500. If you're growing past that, you're duplicating
  row shapes — extract helpers.
- Phase A and Phase B MUST be separated by the checkpoint. Do not
  produce Phase B files until the human confirms Phase A.
- Do NOT create pages for `/agent-versions`, `/agent-actions`,
  `/safety`, `/conversation-flows`, `/kpis`, or `/facilities` —
  those were intentionally dropped. Safety events are still
  WRITTEN (per migration 0004) but not displayed in the UI.

---

## Report back (end of Phase B, after the Phase A checkpoint)

1. Full tree of `apps/dashboard/app/` (5 routes plus `/calls/[id]`,
   `_overview/`, `_components/`).
2. Total LOC of `lib/queries.ts` (target ~400, cap ~500).
3. Complete i18n keys added (both phases), confirming `ar`+`en`
   parity.
4. Any spec simplifications you made and what you did instead.
5. Output of `npm run dev:dashboard` for 5 seconds, then SIGINT.

---

## Verification (the human will run)

```bash
cd <project>
npm run dev:dashboard
# 1. Visit http://localhost:3019 → redirects to /login.
# 2. Enter an email matching an admin_users row → check email (or
#    Supabase local dev terminal for the link).
# 3. Click → land on / (overview). The four sections render seed
#    data: counters, UC tiles, latest 10 conversations, activity.
# 4. Toggle language (sidebar footer) → sidebar slides to the
#    other side; copy is English.
# 5. Toggle theme → smooth dark-mode swap, no flash.
# 6. Walk the 5 routes:
for r in calls visits handovers settings; do
  curl -fI "http://localhost:3019/$r" || echo "FAIL $r"
done
# 7. Open /calls → filter outcome=completed_automated → URL gains
#    ?outcome=… → table re-renders.
# 8. Click a row in /calls → /calls/[id] loads with transcript on
#    one side and tool timeline on the other.
# 9. Open /visits → filter specialty=عيادة القلب → URL gains
#    ?specialtyId=… → table re-renders.
# 10. Open /handovers → click row → drawer with full customer_data
#     JSON and link to source conversation.
# 11. Open /settings → admin list, facility (Dawood, Amman,
#     Asia/Amman, 7 specialties in Arabic), 3 retention windows.
```

If any check fails, fix before declaring step 08 complete. Do NOT
proceed to step 09 with a broken dashboard.

## STOP

Stop here. Wait for me to paste `09_scripts_docs_and_qa.md`.
