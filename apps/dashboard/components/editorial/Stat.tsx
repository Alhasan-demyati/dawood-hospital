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
        "animate-reveal group relative overflow-hidden rounded-2xl border border-border p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl",
        DELAY[delay] ?? "",
        className,
      )}
      style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 9%, var(--color-surface)) 0%, var(--color-surface) 60%)` }}
    >
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
        <span className="text-sm font-medium text-text-primary">{resolvedLabel}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-sans text-3xl font-bold tabular-nums text-text-primary">{display}</span>
        {unit && <span className="text-sm font-semibold" style={{ color: accent }}>{unit}</span>}
        {trendChip && (
          <span className={cn("ms-1 text-xs font-medium", trend && trend > 0 ? "text-success" : "text-danger")}>{trendChip}</span>
        )}
      </div>
      {pct != null && (
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full" style={{ background: `color-mix(in srgb, ${accent} 16%, var(--color-surface))` }} aria-hidden>
          <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${pct}%`, background: accent }} />
        </div>
      )}
      {resolvedSub && <div className="mt-2 text-xs text-text-muted">{resolvedSub}</div>}
    </div>
  );
}
