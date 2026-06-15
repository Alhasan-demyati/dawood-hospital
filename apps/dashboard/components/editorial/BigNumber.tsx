"use client";

import { cn, useLanguage, MedicalGlyph, type TranslationKey, type GlyphName } from "@dawood/shared";
import { toArabicIndicDigits } from "@/lib/format";

const DELAY = ["", "delay-1", "delay-2", "delay-3", "delay-4"];

// Large-numeral "vital" card — top accent rail, colored icon chip with a ring,
// a confident display numeral, a delta chip, and an honest micro-viz footline:
// a fill meter for percentages, a discrete scale for ratings, or a live pulse
// for running counts. Tinted gradient + entrance sheen + staggered reveal.
// Arabic-Indic digits in Arabic. (Used only on the Overview.)
export function BigNumber({
  labelKey,
  label,
  value,
  unit,
  delta,
  accent = "var(--color-accent)",
  iconKey,
  meter,
  scale,
  live = false,
  motif,
  delay = 0,
  className,
}: {
  labelKey?: TranslationKey;
  label?: string;
  value: number | string | null;
  unit?: string;
  delta?: number | null;
  accent?: string;
  iconKey?: GlyphName | string;
  /** 0–100 → renders a fill meter footline. */
  meter?: number | null;
  /** discrete rating → renders `max` segments, filled to `value`. */
  scale?: { value: number | null; max: number } | null;
  /** running count that updates in realtime → renders a live pulse footline. */
  live?: boolean;
  /** faint corner watermark glyph. */
  motif?: GlyphName;
  delay?: number;
  className?: string;
}) {
  const { lang, t } = useLanguage();
  const ar = lang === "ar";
  const fmt = (s: string) => (ar ? toArabicIndicDigits(s) : s);
  const resolvedLabel = label ?? (labelKey ? t(labelKey) : "");
  const raw = value == null ? "—" : String(value);
  const display = value != null ? fmt(raw) : raw;
  const deltaDisplay =
    delta == null || delta === 0
      ? null
      : `${delta > 0 ? "↑" : "↓"} ${fmt(String(Math.abs(delta)))}`;

  const meterPct = meter == null ? null : Math.max(0, Math.min(100, meter));
  const scaleFilled = scale ? Math.max(0, Math.min(scale.max, Math.round(scale.value ?? 0))) : 0;

  return (
    <div
      className={cn(
        "sheen animate-reveal group relative overflow-hidden rounded-2xl border border-border p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lg",
        DELAY[delay] ?? "",
        className,
      )}
      style={{
        background: `linear-gradient(150deg, color-mix(in srgb, ${accent} 13%, var(--color-surface)) 0%, var(--color-surface) 60%)`,
      }}
    >
      {/* inset top highlight — gives the card a crafted, lit edge */}
      <span className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ boxShadow: "var(--highlight-top)" }} aria-hidden />
      {/* top accent rail — a glowing edge, direction-agnostic */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(to right, transparent, ${accent}, transparent)` }}
        aria-hidden
      />
      {/* soft color glow, brightens on hover */}
      <span
        className="pointer-events-none absolute -end-7 -top-7 h-24 w-24 rounded-full opacity-25 blur-2xl transition-opacity duration-300 group-hover:opacity-50"
        style={{ background: accent }}
        aria-hidden
      />
      {/* optional faint corner motif */}
      {motif && (
        <span className="pointer-events-none absolute -bottom-4 -end-3 opacity-[0.06]" style={{ color: accent }} aria-hidden>
          <MedicalGlyph name={motif} className="h-24 w-24" strokeWidth={1.1} />
        </span>
      )}

      <div className="relative flex items-center justify-between">
        <span
          className="grid h-11 w-11 place-items-center rounded-2xl"
          style={{
            background: `color-mix(in srgb, ${accent} 18%, var(--color-surface))`,
            color: accent,
            boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${accent} 32%, transparent)`,
          }}
          aria-hidden
        >
          {iconKey && <MedicalGlyph name={iconKey as GlyphName} className="h-5 w-5" strokeWidth={1.8} />}
        </span>
        {deltaDisplay && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
              delta && delta > 0 ? "text-success" : "text-danger",
            )}
            style={{ background: `color-mix(in srgb, ${delta && delta > 0 ? "var(--color-success)" : "var(--color-danger)"} 14%, var(--color-surface))` }}
          >
            {deltaDisplay}
          </span>
        )}
      </div>

      <div className="t-eyebrow relative mt-5">{resolvedLabel}</div>
      <div className="relative mt-1.5 flex items-baseline gap-1">
        <span className="t-numeral text-[2.7rem] text-text-primary">{display}</span>
        {unit && <span className="text-xl font-bold" style={{ color: accent }}>{unit}</span>}
        {scale && <span className="ms-0.5 text-sm font-semibold text-text-muted">{fmt(`/ ${scale.max}`)}</span>}
      </div>

      {/* footline micro-viz */}
      <div className="relative mt-4 h-2.5">
        {meterPct != null ? (
          <div
            className="h-2 w-full overflow-hidden rounded-full"
            style={{ background: `color-mix(in srgb, ${accent} 14%, var(--color-surface))` }}
            aria-hidden
          >
            <div
              className="meter-fill h-full origin-left rounded-full"
              style={{
                width: `${meterPct}%`,
                background: `linear-gradient(to right, color-mix(in srgb, ${accent} 70%, white), ${accent})`,
              }}
            />
          </div>
        ) : scale ? (
          <div className="flex items-center gap-1" aria-hidden>
            {Array.from({ length: scale.max }).map((_, i) => (
              <span
                key={i}
                className="h-2 flex-1 rounded-full transition-colors"
                style={{ background: i < scaleFilled ? accent : `color-mix(in srgb, ${accent} 16%, var(--color-surface))` }}
              />
            ))}
          </div>
        ) : live ? (
          <div className="t-eyebrow flex items-center gap-1.5" style={{ color: accent }}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: accent }} />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
            </span>
            {t("live_now")}
          </div>
        ) : (
          <div
            className="h-px w-full"
            style={{ background: `linear-gradient(to right, color-mix(in srgb, ${accent} 30%, transparent), transparent)` }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
