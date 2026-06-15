"use client";

import { cn, useLanguage, type TranslationKey } from "@dawood/shared";
import { toArabicIndicDigits } from "@/lib/format";

const DELAY = ["", "delay-1", "delay-2", "delay-3", "delay-4"];

// Compact stat card: label + value (+ unit) + optional sub-label, trend chip,
// and an optional colored progress bar (0–100). Tinted gradient + hover lift.
export function Stat({
  labelKey,
  label,
  value,
  unit,
  subLabelKey,
  subLabel,
  trend,
  accentHex,
  progress,
  delay = 0,
  className,
}: {
  labelKey?: TranslationKey;
  label?: string;
  value: number | string | null;
  unit?: string;
  subLabelKey?: TranslationKey;
  subLabel?: string;
  trend?: number | null;
  accentHex?: string | null;
  progress?: number | null;
  delay?: number;
  className?: string;
}) {
  const { lang, t } = useLanguage();
  const accent = accentHex ?? "var(--color-accent)";
  const resolvedLabel = label ?? (labelKey ? t(labelKey) : "");
  const resolvedSub = subLabel ?? (subLabelKey ? t(subLabelKey) : undefined);
  const raw = value == null ? "—" : String(value);
  const display = lang === "ar" && value != null ? toArabicIndicDigits(raw) : raw;
  const trendChip =
    trend == null || trend === 0
      ? null
      : `${trend > 0 ? "↑" : "↓"} ${lang === "ar" ? toArabicIndicDigits(String(Math.abs(trend))) : Math.abs(trend)}`;
  const pct = progress == null ? null : Math.max(0, Math.min(100, progress));

  return (
    <div
      className={cn(
        "animate-reveal group relative overflow-hidden rounded-2xl border border-border p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lg",
        DELAY[delay] ?? "",
        className,
      )}
      style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 9%, var(--color-surface)) 0%, var(--color-surface) 60%)` }}
    >
      {/* inset top highlight — gives the card a crafted, lit edge */}
      <span className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ boxShadow: "var(--highlight-top)" }} aria-hidden />

      <div className="relative flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
        <span className="t-eyebrow text-text-primary">{resolvedLabel}</span>
      </div>
      <div className="relative mt-2 flex items-baseline gap-1.5">
        <span className="t-numeral text-3xl text-text-primary">{display}</span>
        {unit && <span className="text-sm font-semibold" style={{ color: accent }}>{unit}</span>}
        {trendChip && (
          <span className={cn("ms-1 text-xs font-medium tabular-nums", trend && trend > 0 ? "text-success" : "text-danger")}>{trendChip}</span>
        )}
      </div>
      {pct != null && (
        <div className="relative mt-3 h-2 w-full overflow-hidden rounded-full" style={{ background: `color-mix(in srgb, ${accent} 16%, var(--color-surface))` }} aria-hidden>
          <div
            className="meter-fill h-full origin-left rounded-full"
            style={{ width: `${pct}%`, background: `linear-gradient(to right, color-mix(in srgb, ${accent} 70%, white), ${accent})` }}
          />
        </div>
      )}
      {resolvedSub && <div className="relative mt-2 border-t border-hairline pt-2 text-xs text-text-muted">{resolvedSub}</div>}
    </div>
  );
}
