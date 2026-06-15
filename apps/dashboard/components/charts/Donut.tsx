"use client";

import { useLanguage, type TranslationKey } from "@dawood/shared";
import { toArabicIndicDigits } from "@/lib/format";

export type DonutSlice = { key: string; labelKey: TranslationKey; value: number; color: string };

// SVG donut with a display-font centre total + a legend that carries each
// slice's share. Segments are drawn with rounded caps and a small gap so they
// read as discrete arcs over a faint track. Reads correctly in LTR/RTL (legend
// flows with dir; the ring is geometry-only).
export function Donut({ slices, totalLabelKey }: { slices: DonutSlice[]; totalLabelKey: TranslationKey }) {
  const { lang, t } = useLanguage();
  const fmt = (n: number) => (lang === "ar" ? toArabicIndicDigits(String(n)) : String(n));
  const total = slices.reduce((s, x) => s + x.value, 0);
  const R = 52;
  const C = 2 * Math.PI * R;
  const GAP = total > 1 ? 3 : 0; // visual gap between arcs (in path units)
  let acc = 0;

  if (!total) {
    return <p className="py-8 text-center text-sm text-text-muted">{t("chart_empty")}</p>;
  }

  return (
    <div className="flex items-center gap-5">
      <div className="donut-wrap relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 130 130" className="h-full w-full -rotate-90">
          <circle cx="65" cy="65" r={R} fill="none" strokeWidth="12" style={{ stroke: "var(--color-hairline)" }} />
          {slices.map((s) => {
            const frac = s.value / total;
            const seg = Math.max(0, frac * C - GAP);
            const dashoffset = -acc;
            acc += frac * C;
            return (
              <circle
                key={s.key}
                cx="65"
                cy="65"
                r={R}
                fill="none"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${seg} ${C - seg}`}
                strokeDashoffset={dashoffset}
                style={{ stroke: s.color }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="t-numeral text-[1.7rem] leading-none text-text-primary">{fmt(total)}</div>
            <div className="t-eyebrow mt-1 text-text-muted">{t(totalLabelKey)}</div>
          </div>
        </div>
      </div>
      <ul className="flex flex-1 flex-col gap-2">
        {slices.map((s) => {
          const share = Math.round((s.value / total) * 100);
          return (
            <li key={s.key} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
              <span className="t-body-sm flex-1 truncate text-text-primary">{t(s.labelKey)}</span>
              <span className="t-caption tabular-nums text-text-faint">{fmt(share)}%</span>
              <span className="t-numeral w-6 text-end text-sm text-text-primary">{fmt(s.value)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
