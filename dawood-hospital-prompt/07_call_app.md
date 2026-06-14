<!-- Dawood Hospital simplification of hospitals/07_call_app.md
     drops: Asia/Riyadh default, multi-region hero copy, generic hospital wording
     adds: Asia/Amman default, Dawood-specific hero copy + subtitle, Jordan MoH
           consent wording, @dawood/* imports, mention of booking/visit-status/
           directions in subtitle -->

# STEP 07 — Call app (customer-facing voice orb for مستشفى داوود)

> Prerequisites: steps 01–06 complete. The scaffolded `apps/call/` exists
> from step 02, and the ElevenLabs agent (Salma / سلمى) is configured
> per step 05.
>
> Scope of THIS prompt: implement the customer-facing call UI in
> `apps/call/`. RTL-first, Arabic-first, voice orb wired to ElevenLabs
> via WebSocket. Single facility (Dawood Hospital), Jordan timezone
> (Asia/Amman). No mock-vs-live switching, no multi-region logic.

## What to produce

```
apps/call/
├── app/
│   ├── layout.tsx                  (RTL + language + theme providers)
│   ├── page.tsx                    (the call orb screen)
│   ├── loading.tsx
│   ├── globals.css
│   └── _components/
│       ├── CallOrb.tsx             ("client") — the voice orb itself
│       ├── TranscriptStream.tsx    ("client") — live transcript bubbles
│       ├── TrustCards.tsx          ("server") — small reassurance cards
│       ├── ConsentBanner.tsx       ("client") — pre-call consent text
│       └── HeroCopy.tsx            ("server") — title + subtitle
├── lib/
│   ├── elevenlabs.ts               (config helper: session start, env reads)
│   ├── date-context.ts             (buildArabicDateInfo for Asia/Amman)
│   └── flags.ts                    (env-driven feature flags)
└── .env.example                    (already from step 02; add anything new)
```

## Page composition (`apps/call/app/page.tsx`)

Layout (Arabic, RTL default), top to bottom:

1. Top row: `[LanguageToggle]  [ThemeToggle]` (LTR row in source; RTL
   reorders visually).
2. Hero: title "مساعد مستشفى داوود الصوتي" + subtitle
   "للحجز، أو الاستفسار عن موعدكم، أو الاتجاهات وأوقات الدوام".
3. Centered orb with the hint "اضغطوا للبدء" beneath it.
4. Transcript bubble area (appears once the call is live).
5. Three TrustCards in a row: privacy / 24-7 / bilingual.

The server component renders hero + 3 trust cards + slots for the
client orb and client transcript.

The orb is the start/restart affordance — there's **no separate "Start"
button**. Click the orb → call starts. Click again while connected →
ends. Click again after end → restarts. This pattern is intentional;
keep it.

## CallOrb.tsx — implementation specifics

This is a **client component**. It uses the `@elevenlabs/react` SDK:

```tsx
"use client";
import { useConversation } from "@elevenlabs/react";
import { buildArabicDateInfo } from "@/lib/date-context";
import { useLanguage } from "@dawood/shared/i18n";

export function CallOrb({ agentId }: { agentId: string }) {
  const { language } = useLanguage();
  const conversation = useConversation({
    connectionType: "websocket",            // NOT webrtc — ICE timeouts
    onConnect: () => { /* set state */ },
    onDisconnect: () => { /* set state */ },
    onMessage: (m) => { /* push to transcript */ },
    onError: (e) => { /* show error banner */ },
  });

  const startCall = async () => {
    await conversation.startSession({
      agentId,
      dynamicVariables: {
        current_date_info: buildArabicDateInfo(new Date(), "Asia/Amman"),
        language,                          // "ar" or "en"
      },
    });
  };

  // ... render an animated SVG/CSS orb whose visual state reflects
  //     status: idle / listening / speaking / error.
}
```

**Visual orb states**:

- `idle` — soft pulse, accent-soft color, slow breath
- `listening` (mic active, user speaking) — outward ripple, accent color
- `speaking` (agent speaking) — inward pulse, warm tint
- `error` — red flash + return to idle

Implement the orb as a single SVG or CSS-only — no external animation
library. Use the shared `animations.css` `pulse-dot` keyframes as a base.

Mic permission: request via `getUserMedia` on first start. If denied,
show a banner explaining what's needed; do not block the page.

## TranscriptStream.tsx — implementation specifics

- Client component.
- Receives messages from `useConversation` callbacks — bubble them up
  from `CallOrb` via props or lift `useState` in `page.tsx`. Plain
  React state is fine; no Zustand needed.
- Each message → a bubble. Agent bubble on one side (accent-tinted),
  user bubble on the opposite side (muted). Direction follows
  `language`.
- Bubbles fade in with the shared `reveal` animation. Auto-scroll to
  the newest bubble.
- Empty state (call hasn't started): "بمجرد بدء المكالمة، ستظهر هنا
  التفاصيل التي يتم تأكيدها معًا".

## TrustCards.tsx — content

Three small server-rendered cards with an icon + 1-line label:

1. "خصوصيتكم محمية — مكالماتكم مسجَّلة بموافقتكم لأغراض جودة الخدمة"
2. "متوفر على مدار الساعة — ٢٤ ساعة، ٧ أيام في الأسبوع"
3. "يدعم العربية والإنجليزية — بحسب اختياركم"

Source the text from the i18n dictionary so the English toggle works:

- `trust_privacy`
- `trust_availability`
- `trust_languages`

## ConsentBanner.tsx — content

A non-blocking banner above the orb on first visit (track with
`localStorage` or just always show — POC scope):

```
هذه المكالمة قد تُسجَّل لأغراض جودة الرعاية والتدريب، وفقًا لإرشادات وزارة الصحة الأردنية. عند بدء المكالمة، تطلب سلمى موافقتكم صراحةً قبل المتابعة.
```

Plus a small "اعرفوا المزيد" link to `/privacy` (a placeholder route is
fine — step 09 produces the actual privacy page if needed).

**Important:** the source file `ConsentBanner.tsx` must include an HTML
comment at the top:

```tsx
{/* <!-- REVIEW WITH LEGAL --> consent copy must be vetted with Jordan MoH
     and Dawood Hospital legal counsel before going live. */}
```

This mirrors the master briefing's compliance discipline (every
consent-touching artifact carries the marker).

## buildArabicDateInfo() — implementation

`lib/date-context.ts` exports:

```ts
export function buildArabicDateInfo(now: Date, tz = "Asia/Amman"): string {
  // Returns a 21-day weekday reference table as a single multi-line string.
  // First line: "Today is <weekday> the <date>"
  // Next 20 lines: tomorrow + 1 + 2 + … each with its weekday.
  // The system prompt reads this as `{{current_date_info}}` to ground
  // its date arithmetic.
}
```

Default timezone is **Asia/Amman** (Jordan). The caller can pass a
different tz for testing but production always uses Amman.

Format example (assume today is Sunday 1 June 2026 in Amman):

```
اليوم الأحد الموافق ١ يونيو ٢٠٢٦
غدًا الإثنين ٢ يونيو ٢٠٢٦
بعد غد الثلاثاء ٣ يونيو ٢٠٢٦
...
```

Use `Intl.DateTimeFormat("ar", { timeZone: tz, weekday: "long",
day: "numeric", month: "long", year: "numeric" })`. Numerals must be
Arabic-Indic (٠١٢…) — `Intl.DateTimeFormat` with locale `"ar"` produces
these by default; verify in the dev console after wiring up.

## layout.tsx — provider stack

```tsx
import { LanguageProvider } from "@dawood/shared/i18n";
import { ThemeProvider } from "@dawood/shared/theme";
import "./globals.css";

export const metadata = {
  title: "مساعد مستشفى داوود الصوتي",
  description: "تحدّثوا مع المساعد الصوتي لمستشفى داوود — للحجز، أو الاستفسار عن موعدكم، أو الاتجاهات وأوقات الدوام.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <LanguageProvider defaultLanguage="ar">
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

`LanguageProvider` must flip `html.lang` and `html.dir` when the toggle
is clicked. Do this with a small client side-effect inside the provider.

## globals.css

```css
@import "@dawood/shared/styles/tokens.css";
@import "@dawood/shared/styles/animations.css";
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
}
```

## flags.ts — env-driven flags

```ts
export const flags = {
  showTranscript: process.env.NEXT_PUBLIC_SHOW_TRANSCRIPT !== "false",
  showConsentBanner: process.env.NEXT_PUBLIC_SHOW_CONSENT_BANNER !== "false",
};
```

## .env.example additions (in `apps/call/.env.example`)

```
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=
DEFAULT_TIMEZONE=Asia/Amman
DEFAULT_LOCALE=ar
NEXT_PUBLIC_SHOW_TRANSCRIPT=true
NEXT_PUBLIC_SHOW_CONSENT_BANNER=true
```

## i18n dictionary additions (in `@dawood/shared/i18n/dictionary.ts`)

Add these **13 keys**, BOTH `ar` and `en`:

- `callPage_title` — "مساعد مستشفى داوود الصوتي" / "Dawood Hospital voice assistant"
- `callPage_subtitle` — "للحجز، أو الاستفسار عن موعدكم، أو الاتجاهات وأوقات الدوام" / "Bookings, visit status, directions, and clinic hours"
- `callOrb_idle_hint` — "اضغطوا للبدء" / "Tap to start"
- `callOrb_listening` — "استمع إليكم" / "Listening"
- `callOrb_speaking` — "يتحدث" / "Speaking"
- `callOrb_error` — "حدث خطأ — حاولوا مرة أخرى" / "Something went wrong — try again"
- `transcript_empty` — "بمجرد بدء المكالمة، ستظهر هنا التفاصيل التي يتم تأكيدها معًا" / "Once the call starts, the details you confirm together will appear here"
- `trust_privacy` — see TrustCards section
- `trust_availability` — see TrustCards section
- `trust_languages` — see TrustCards section
- `consent_banner` — see ConsentBanner section (Jordan MoH wording)
- `consent_learn_more` — "اعرفوا المزيد" / "Learn more"
- `mic_permission_needed` — "نحتاج إلى صلاحية الميكروفون لإجراء المكالمة" / "Microphone access is required to start the call"

Confirm same-keys parity (ar ↔ en) by running the existing parity check
from step 02.

## RTL acceptance test (the human runs this)

After implementation, the human will:

1. Visit `http://localhost:3018` → Arabic RTL, hero reads "مساعد مستشفى
   داوود الصوتي".
2. Language toggle → English LTR; hero reads "Dawood Hospital voice
   assistant"; orb stays centered.
3. Language toggle back → Arabic RTL.
4. Theme toggle → dark mode swap, smooth, no flash.
5. Click orb without `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` set → clean
   error banner in the active language.
6. Set the agent ID env var and reload → click orb → mic permission
   asked → orb transitions to `listening`.
7. Speak → user bubble appears. Agent (سلمى) replies → agent bubble
   appears on the opposite side.
8. Click orb again to end → orb returns to `idle`. Transcript clears
   or persists (your call — document either in the report).

## Execution discipline

- Server components by default; `"use client"` only for `CallOrb`,
  `TranscriptStream`, and `ConsentBanner` (these need state / browser
  APIs).
- **Do not install new dependencies** beyond `@elevenlabs/react`
  (already in `package.json` from step 02).
- Do not modify `packages/shared` beyond adding the 13 dictionary keys
  listed above.
- Keep the orb implementation **CSS / SVG only** — no Three.js, no
  Lottie, no canvas libraries.
- The orb is the start/restart affordance — **do not add a separate
  Start button** anywhere on the page.
- Default timezone everywhere is **Asia/Amman**. Do not leave any
  Asia/Riyadh references behind — the master briefing's jurisdiction
  is Jordan.
- Imports use `@dawood/shared/*` — never `@hospitals/shared/*` and
  never `@belron/shared/*`.
- The `ConsentBanner.tsx` file must carry a `<!-- REVIEW WITH LEGAL -->`
  comment.

## Report back

When done, print:

1. List of files created / modified (absolute paths under
   `apps/call/` and `packages/shared/i18n/`).
2. The 13 i18n keys added, with their Arabic values.
3. A description of the orb's 4 visual states and the CSS/SVG mechanism
   used to drive them.
4. The output of `npm run dev:call` for ~5 seconds (then SIGINT),
   showing it serves on port 3018.
5. Any compromise or deviation you made — and why.

## Verification (the human will run)

```bash
cd <project>
npm run dev:call
# Visit http://localhost:3018 in a browser.
# - Confirm hero reads "مساعد مستشفى داوود الصوتي" and direction is RTL.
# - Toggle language → English LTR, hero reads "Dawood Hospital voice assistant".
# - Toggle theme → dark mode swap, no flash.
# - Click orb without an agent ID → clean error banner.
# - Set NEXT_PUBLIC_ELEVENLABS_AGENT_ID and reload → mic permission +
#   orb transitions through listening / speaking states with سلمى.

# Quick sanity grep — must return nothing:
grep -R "Asia/Riyadh"   apps/call/ packages/shared/ || echo "OK: no Riyadh refs"
grep -R "@hospitals/"   apps/call/                  || echo "OK: no @hospitals imports"
```

## STOP

Stop here. Wait for me to paste `08a_dashboard_core.md`.
