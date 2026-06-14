"use client";

import { useLanguage } from "@dawood/shared";
import { toArabicIndicDigits } from "@/lib/format";

type Point = { date: string; count: number };

// Animated vertical bar chart of upcoming scheduled visits per day. Rendered
// LTR (conventional axis) with localized weekday + day-of-month labels.
export function TrendBars({ points, accent = "var(--color-accent)" }: { points: Point[]; accent?: string }) {
  const { lang, t } = useLanguage();
  const fmt = (n: number) => (lang === "ar" ? toArabicIndicDigits(String(n)) : String(n));
  const max = Math.max(1, ...points.map((p) => p.count));

  if (!points.length) {
    return <p className="py-8 text-center text-sm text-text-muted">{t("chart_empty")}</p>;
  }

  const label = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    const loc = lang === "ar" ? "ar-JO-u-nu-arab" : "en-US";
    return {
      // narrow weekday (single glyph) keeps the 7-column axis tidy on mobile
      wd: new Intl.DateTimeFormat(loc, { weekday: "narrow" }).format(d),
      dm: new Intl.DateTimeFormat(loc, { day: "numeric" }).format(d),
    };
  };

  return (
    <div dir="ltr" className="flex h-44 items-end justify-between gap-2 pt-2">
      {points.map((p, i) => {
        const h = Math.max(6, Math.round((p.count / max) * 100));
        const { wd, dm } = label(p.date);
        const today = i === 0;
        return (
          <div key={p.date} className="group/bar flex flex-1 flex-col items-center gap-1.5">
            <span className="text-xs font-bold tabular-nums" style={{ color: accent }}>{fmt(p.count)}</span>
            <div className="flex w-full flex-1 items-end justify-center">
              <div
                className="chart-bar w-full max-w-[2rem] rounded-t-lg shadow-sm transition-transform duration-200 group-hover/bar:scale-x-105"
                style={{
                  height: `${h}%`,
                  background: `linear-gradient(to top, ${accent}, color-mix(in srgb, ${accent} 45%, white))`,
                  animationDelay: `${i * 70}ms`,
                  outline: today ? `2px solid color-mix(in srgb, ${accent} 35%, transparent)` : undefined,
                  outlineOffset: today ? "2px" : undefined,
                }}
                aria-hidden
              />
            </div>
            <span className="text-[11px] font-bold text-text-primary">{wd}</span>
            <span className="text-[10px] tabular-nums text-text-muted">{dm}</span>
          </div>
        );
      })}
    </div>
  );
}
