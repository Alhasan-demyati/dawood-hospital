"use client";

import { useLanguage, type TranslationKey } from "@dawood/shared";
import { toArabicIndicDigits } from "@/lib/format";

export type DonutSlice = { key: string; labelKey: TranslationKey; value: number; color: string };

// SVG donut with a centered total + legend. Segments drawn with stroke-dasharray;
// the whole ring pops in. Reads correctly in both LTR/RTL (legend flows with dir).
export function Donut({ slices, totalLabelKey }: { slices: DonutSlice[]; totalLabelKey: TranslationKey }) {
  const { lang, t } = useLanguage();
  const fmt = (n: number) => (lang === "ar" ? toArabicIndicDigits(String(n)) : String(n));
  const total = slices.reduce((s, x) => s + x.value, 0);
  const R = 52;
  const C = 2 * Math.PI * R;
  let acc = 0;

  if (!total) {
    return <p className="py-8 text-center text-sm text-text-muted">{t("chart_empty")}</p>;
  }

  return (
    <div className="flex items-center gap-5">
      <div className="donut-wrap relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 130 130" className="h-full w-full -rotate-90">
          <circle cx="65" cy="65" r={R} fill="none" strokeWidth="13" style={{ stroke: "color-mix(in srgb, var(--color-text-muted) 14%, transparent)" }} />
          {slices.map((s) => {
            const dash = (s.value / total) * C;
            const seg = (
              <circle
                key={s.key}
                cx="65"
                cy="65"
                r={R}
                fill="none"
                strokeWidth="13"
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-acc}
                style={{ stroke: s.color }}
              />
            );
            acc += dash;
            return seg;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="font-sans text-2xl font-bold tabular-nums text-text-primary">{fmt(total)}</div>
            <div className="text-[10px] font-medium text-text-muted">{t(totalLabelKey)}</div>
          </div>
        </div>
      </div>
      <ul className="flex flex-1 flex-col gap-2">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
            <span className="flex-1 text-text-primary">{t(s.labelKey)}</span>
            <span className="font-bold tabular-nums text-text-muted">{fmt(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
