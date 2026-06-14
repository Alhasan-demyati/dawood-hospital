"use client";

import { useLanguage } from "@dawood/shared";
import { toArabicIndicDigits } from "@/lib/format";

type Row = { name_ar: string; color_hex: string | null; count: number };

// Horizontal bars, each painted with the specialty's OWN color_hex from the DB —
// so the palette is authentic to the data, not invented. Widths grow in.
export function SpecialtyBars({ rows }: { rows: Row[] }) {
  const { lang, t } = useLanguage();
  const fmt = (n: number) => (lang === "ar" ? toArabicIndicDigits(String(n)) : String(n));
  const max = Math.max(1, ...rows.map((r) => r.count));

  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-text-muted">{t("chart_empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-3.5">
      {rows.map((r, i) => {
        const w = Math.max(4, Math.round((r.count / max) * 100));
        const c = r.color_hex ?? "var(--color-accent)";
        return (
          <div key={r.name_ar} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-xs font-medium text-text-primary sm:w-32" title={r.name_ar}>
              {r.name_ar}
            </span>
            <div
              className="relative h-3.5 flex-1 overflow-hidden rounded-full"
              style={{ background: `color-mix(in srgb, ${c} 14%, var(--color-surface))` }}
            >
              <div
                className="chart-grow absolute inset-y-0 start-0 rounded-full shadow-sm"
                style={{
                  width: `${w}%`,
                  background: `linear-gradient(to left, ${c}, color-mix(in srgb, ${c} 55%, white))`,
                  animationDelay: `${i * 60}ms`,
                }}
                aria-hidden
              />
            </div>
            <span className="w-7 shrink-0 text-end text-xs font-bold tabular-nums" style={{ color: c }}>
              {fmt(r.count)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
