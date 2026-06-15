"use client";

import { useLanguage, SpecialtyGlyph } from "@dawood/shared";
import { toArabicIndicDigits } from "@/lib/format";

type Row = { name_ar: string; color_hex: string | null; count: number };

// Ranked horizontal bars, each painted with the specialty's OWN color_hex from
// the DB — so the palette is authentic to the data, not invented. Each row leads
// with a tinted specialty glyph chip + a faint rank numeral, then a hairline
// track whose fill grows in, brightening on hover. The count sits as a tabular
// numeral tinted to the row's own color.
export function SpecialtyBars({ rows }: { rows: Row[] }) {
  const { lang, t } = useLanguage();
  const fmt = (n: number) => (lang === "ar" ? toArabicIndicDigits(String(n)) : String(n));

  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-text-muted">{t("chart_empty")}</p>;
  }

  const sorted = [...rows].sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...sorted.map((r) => r.count));

  return (
    <div className="flex flex-col gap-2.5">
      {sorted.map((r, i) => {
        const w = Math.max(4, Math.round((r.count / max) * 100));
        const c = r.color_hex ?? "var(--color-accent)";
        const rank = lang === "ar" ? toArabicIndicDigits(String(i + 1)) : String(i + 1);
        return (
          <div
            key={r.name_ar}
            className="group/row flex items-center gap-3 border-b border-hairline pb-2.5 last:border-b-0 last:pb-0"
          >
            <span className="t-numeral w-4 shrink-0 text-end text-[11px] text-text-faint">{rank}</span>
            <SpecialtyGlyph color={c} name="pulse" />
            <span className="w-20 shrink-0 truncate text-xs font-medium text-text-primary sm:w-28" title={r.name_ar}>
              {r.name_ar}
            </span>
            <div
              className="relative h-3.5 flex-1 overflow-hidden rounded-full"
              style={{ background: `color-mix(in srgb, ${c} 12%, var(--color-surface))` }}
            >
              <div
                className="chart-grow absolute inset-y-0 start-0 rounded-full transition-[filter] duration-200 group-hover/row:brightness-110"
                style={{
                  width: `${w}%`,
                  background: `linear-gradient(to left, ${c}, color-mix(in srgb, ${c} 55%, white))`,
                  boxShadow: `0 0 0 1px color-mix(in srgb, ${c} 30%, transparent) inset`,
                  animationDelay: `${i * 60}ms`,
                }}
                aria-hidden
              />
            </div>
            <span className="t-numeral w-7 shrink-0 text-end text-sm" style={{ color: c }}>
              {fmt(r.count)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
