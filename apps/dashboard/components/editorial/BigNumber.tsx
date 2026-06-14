"use client";

import { cn, useLanguage, type TranslationKey } from "@dawood/shared";
import { toArabicIndicDigits } from "@/lib/format";

// Icon set for the metric cards — stroke icons, inherit currentColor.
const ICONS: Record<string, JSX.Element> = {
  phone: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h3l2 5-2 1a11 11 0 0 0 5 5l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="M9 12l2 2 4-4" />
    </svg>
  ),
  handover: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 8l-4 4 4 4M3 12h11M17 16l4-4-4-4M21 12H10" />
    </svg>
  ),
  smile: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M8 14a4 4 0 0 0 8 0" /><path d="M9 9h.01M15 9h.01" />
    </svg>
  ),
};

const DELAY = ["", "delay-1", "delay-2", "delay-3", "delay-4"];

// Large numeral metric card — colored icon chip, soft gradient tint + glow,
// delta chip, staggered entrance. Arabic-Indic digits in Arabic.
export function BigNumber({
  labelKey,
  label,
  value,
  unit,
  delta,
  accent = "var(--color-accent)",
  iconKey,
  delay = 0,
  className,
}: {
  labelKey?: TranslationKey;
  label?: string;
  value: number | string | null;
  unit?: string;
  delta?: number | null;
  accent?: string;
  iconKey?: keyof typeof ICONS | string;
  delay?: number;
  className?: string;
}) {
  const { lang, t } = useLanguage();
  const resolvedLabel = label ?? (labelKey ? t(labelKey) : "");
  const raw = value == null ? "—" : String(value);
  const display = lang === "ar" && value != null ? toArabicIndicDigits(raw) : raw;
  const deltaDisplay =
    delta == null || delta === 0
      ? null
      : `${delta > 0 ? "↑" : "↓"} ${lang === "ar" ? toArabicIndicDigits(String(Math.abs(delta))) : Math.abs(delta)}`;
  const icon = iconKey ? ICONS[iconKey] : null;

  return (
    <div
      className={cn(
        "animate-reveal group relative overflow-hidden rounded-2xl border border-border p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl",
        DELAY[delay] ?? "",
        className,
      )}
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 12%, var(--color-surface)) 0%, var(--color-surface) 62%)`,
      }}
    >
      {/* soft color glow, brightens on hover */}
      <span
        className="pointer-events-none absolute -end-7 -top-7 h-24 w-24 rounded-full opacity-25 blur-2xl transition-opacity duration-300 group-hover:opacity-45"
        style={{ background: accent }}
        aria-hidden
      />
      <div className="relative flex items-center justify-between">
        <span
          className="grid h-10 w-10 place-items-center rounded-xl shadow-sm"
          style={{ background: `color-mix(in srgb, ${accent} 18%, var(--color-surface))`, color: accent }}
          aria-hidden
        >
          {icon}
        </span>
        {deltaDisplay && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              delta && delta > 0 ? "text-success" : "text-danger",
            )}
            style={{ background: `color-mix(in srgb, ${delta && delta > 0 ? "var(--color-success)" : "var(--color-danger)"} 14%, var(--color-surface))` }}
          >
            {deltaDisplay}
          </span>
        )}
      </div>
      <div className="relative mt-4 text-xs font-medium uppercase tracking-wide text-text-muted">{resolvedLabel}</div>
      <div className="relative mt-1 flex items-baseline gap-1.5">
        <span className="font-sans text-4xl font-bold tabular-nums text-text-primary">{display}</span>
        {unit && <span className="text-lg font-semibold" style={{ color: accent }}>{unit}</span>}
      </div>
    </div>
  );
}
