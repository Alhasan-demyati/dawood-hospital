import { LanguageToggle, ThemeToggle } from "@dawood/shared";
import { getAgentId } from "@/lib/elevenlabs";
import { flags } from "@/lib/flags";
import { HeroCopy } from "./_components/HeroCopy";
import { ConsentBanner } from "./_components/ConsentBanner";
import { CallStage } from "./_components/CallStage";
import { TrustCards } from "./_components/TrustCards";

// Fixed particle field (deterministic — avoids SSR/CSR hydration mismatch).
const PARTICLES = [
  { left: "5%", size: 6, dur: 17, delay: 0, gold: false },
  { left: "13%", size: 4, dur: 23, delay: 5, gold: true },
  { left: "22%", size: 8, dur: 15, delay: 9, gold: false },
  { left: "31%", size: 5, dur: 26, delay: 2, gold: false },
  { left: "39%", size: 3, dur: 20, delay: 12, gold: true },
  { left: "47%", size: 7, dur: 19, delay: 7, gold: false },
  { left: "55%", size: 4, dur: 24, delay: 3, gold: true },
  { left: "63%", size: 6, dur: 16, delay: 14, gold: false },
  { left: "71%", size: 5, dur: 28, delay: 1, gold: false },
  { left: "79%", size: 3, dur: 21, delay: 10, gold: true },
  { left: "86%", size: 7, dur: 18, delay: 6, gold: false },
  { left: "93%", size: 4, dur: 25, delay: 13, gold: false },
];

export default function CallPage() {
  const agentId = getAgentId();

  return (
    <main className="call-bg relative flex min-h-screen flex-col overflow-hidden text-text-primary">
      {/* drifting aurora + particle field — ambient motion behind everything */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <span className="call-blob call-blob-1" />
        <span className="call-blob call-blob-2" />
        <span className="call-blob call-blob-3" />

        {/* hospital skyline — a calm medical-campus silhouette along the ground */}
        <div className="call-scene">
          <div className="call-ekg">
            <svg viewBox="0 0 1280 70" preserveAspectRatio="none">
              <path d="M0 35 H300 l14 0 l10 -24 l14 48 l12 -44 l10 36 l9 -16 H560 l16 0 l9 -20 l13 40 l10 -34 l9 28 l8 -14 H980 l300 0" />
            </svg>
          </div>
          <div className="call-skyline" />
          <div className="call-windows" />
          <span className="call-cross" />
        </div>

        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="call-particle"
            style={{
              insetInlineStart: p.left,
              width: p.size,
              height: p.size,
              background: p.gold
                ? "color-mix(in srgb, var(--color-accent-2) 75%, transparent)"
                : "color-mix(in srgb, var(--color-accent) 68%, transparent)",
              boxShadow: p.gold
                ? "0 0 8px color-mix(in srgb, var(--color-accent-2) 60%, transparent)"
                : "0 0 8px color-mix(in srgb, var(--color-accent) 55%, transparent)",
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-3">
          {/* Emblem: a rounded squircle holding a medical cross + heartbeat tick */}
          <span
            className="relative grid h-11 w-11 place-items-center rounded-[14px] shadow-md"
            style={{
              background: "linear-gradient(155deg, var(--color-accent), var(--color-accent-strong))",
              boxShadow:
                "inset 0 1px 0 color-mix(in srgb, #fff 28%, transparent), 0 6px 18px -6px color-mix(in srgb, var(--color-accent) 60%, transparent)",
            }}
          >
            <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden>
              {/* gold ring */}
              <circle
                cx="16" cy="16" r="11.5"
                fill="none"
                strokeWidth="1.4"
                opacity="0.9"
                style={{ stroke: "var(--color-accent-2)" }}
              />
              {/* medical cross */}
              <path
                d="M13.4 7.5h5.2v5.4h5.4v5.2h-5.4v5.4h-5.2v-5.4H8v-5.2h5.4z"
                fill="#fff"
                opacity="0.96"
              />
              {/* heartbeat tick across the cross */}
              <path
                d="M9 16h2.6l1.5-3 2 6 1.6-4 1 1h4.3"
                fill="none"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ stroke: "var(--color-accent-2)" }}
              />
            </svg>
            <span
              className="absolute -end-0.5 -top-0.5 h-3 w-3 rounded-full border-2"
              style={{ background: "var(--color-accent-2)", borderColor: "var(--color-surface)" }}
              aria-hidden
            />
          </span>
          {/* Wordmark with a gold hairline divider */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col leading-none">
              <span className="font-display text-[15px] font-bold tracking-tight text-text-primary">
                مستشفى داوود
              </span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                Dawood Hospital
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-10 px-6 pb-24 pt-4">
        {flags.showConsentBanner && <ConsentBanner />}
        <HeroCopy />
        <div className="relative w-full">
          {/* gold hairline crowning the stage */}
          <span
            className="absolute inset-x-10 -top-px h-px"
            style={{ background: "linear-gradient(to left, transparent, var(--color-accent-2), transparent)" }}
            aria-hidden
          />
          <div
            className="relative flex w-full justify-center overflow-hidden rounded-[28px] border border-border px-3 py-8 shadow-lg backdrop-blur-xl sm:px-12 sm:py-10"
            style={{ background: "color-mix(in srgb, var(--color-surface) 60%, transparent)" }}
          >
            <CallStage agentId={agentId} />
          </div>
        </div>
        <TrustCards />
      </section>

      <footer className="relative z-10 pb-6 text-center">
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
          Powered by Curizen
        </span>
      </footer>
    </main>
  );
}
