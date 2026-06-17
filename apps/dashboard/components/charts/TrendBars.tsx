"use client";

import { useLanguage } from "@dawood/shared";
import { toArabicIndicDigits } from "@/lib/format";

type Point = { date: string; count: number };

// Upcoming scheduled visits per day, drawn as gradient columns with a traced
// sparkline + area fill over them, value labels floating at each node, and a
// soft baseline. Rendered LTR (conventional axis) with localized weekday + day.
// All geometry references the same normalized plot box so bars, line, dots and
// labels stay pixel-aligned at any width.
export function TrendBars({ points, accent = "var(--color-accent)" }: { points: Point[]; accent?: string }) {
  const { lang, t } = useLanguage();
  const fmt = (n: number) => (lang === "ar" ? toArabicIndicDigits(String(n)) : String(n));
  const n = points.length;
  const max = Math.max(1, ...points.map((p) => p.count));
  // Headroom: keep the tallest column around ~82% so the node + floating value
  // label always clear the card title rather than slamming the ceiling.
  const scaleMax = max / 0.82;

  if (!n) {
    return <p className="py-8 text-center text-sm text-text-muted">{t("chart_empty")}</p>;
  }

  const label = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    const loc = lang === "ar" ? "ar-JO-u-nu-arab" : lang === "de" ? "de-DE" : "en-US";
    return {
      wd: new Intl.DateTimeFormat(loc, { weekday: "narrow" }).format(d),
      dm: new Intl.DateTimeFormat(loc, { day: "numeric" }).format(d),
    };
  };

  // Normalized plot geometry (0..100 in both axes), column-centred.
  const geom = points.map((p, i) => {
    const h = (p.count / scaleMax) * 100; // plot-height %
    const cx = ((i + 0.5) / n) * 100;
    const cy = 100 - h;
    return { ...p, i, h, cx, cy };
  });
  const lineD = geom.map((g, i) => `${i === 0 ? "M" : "L"} ${g.cx.toFixed(2)} ${g.cy.toFixed(2)}`).join(" ");
  const areaD =
    `M ${geom[0].cx.toFixed(2)} 100 ` +
    geom.map((g) => `L ${g.cx.toFixed(2)} ${g.cy.toFixed(2)}`).join(" ") +
    ` L ${geom[n - 1].cx.toFixed(2)} 100 Z`;

  return (
    <div dir="ltr" className="select-none">
      <div className="relative h-44">
        {/* faint guide lines */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {[0, 50, 100].map((p) => (
            <div
              key={p}
              className="absolute inset-x-0 h-px"
              style={{ top: `${p}%`, background: "color-mix(in srgb, var(--color-hairline) 70%, transparent)" }}
            />
          ))}
        </div>

        {/* area + line overlay (non-scaling stroke keeps the line crisp) */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.34" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path
            className="spark-area"
            d={areaD}
            fill="url(#trend-area)"
            style={{ transformBox: "fill-box", transformOrigin: "bottom" }}
          />
          <path
            className="spark-line"
            d={lineD}
            fill="none"
            stroke={accent}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            pathLength={100}
            style={{ ["--spark-len" as never]: 100 }}
          />
        </svg>

        {/* columns */}
        <div className="absolute inset-0 flex items-end gap-2">
          {geom.map((g) => (
            <div key={g.date} className="group/bar flex h-full flex-1 items-end justify-center">
              <div
                className="chart-bar w-full max-w-[1.6rem] rounded-t-md transition-[filter] duration-200 group-hover/bar:brightness-110"
                style={{
                  height: `${Math.max(3, g.h)}%`,
                  background: `linear-gradient(to top, color-mix(in srgb, ${accent} 30%, transparent), color-mix(in srgb, ${accent} 12%, transparent))`,
                  animationDelay: `${g.i * 70}ms`,
                }}
              />
            </div>
          ))}
        </div>

        {/* nodes + floating value labels */}
        {geom.map((g) => {
          const today = g.i === 0;
          return (
            <div
              key={`node-${g.date}`}
              className="pointer-events-none absolute"
              style={{ left: `${g.cx}%`, top: `${g.cy}%`, transform: "translate(-50%, -50%)" }}
            >
              <span
                className="block rounded-full"
                style={{
                  width: today ? 11 : 7,
                  height: today ? 11 : 7,
                  background: accent,
                  boxShadow: today
                    ? `0 0 0 3px color-mix(in srgb, ${accent} 22%, var(--color-surface)), 0 0 0 1px var(--color-surface)`
                    : `0 0 0 2px var(--color-surface)`,
                }}
              />
              <span
                className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-bold tabular-nums"
                style={{ bottom: "calc(100% + 5px)", color: accent }}
              >
                {fmt(g.count)}
              </span>
            </div>
          );
        })}
      </div>

      {/* axis labels */}
      <div className="mt-2.5 flex gap-2">
        {geom.map((g) => {
          const { wd, dm } = label(g.date);
          const today = g.i === 0;
          return (
            <div key={`ax-${g.date}`} className="flex flex-1 flex-col items-center gap-0.5">
              <span className={today ? "text-[11px] font-bold text-accent" : "text-[11px] font-bold text-text-primary"}>{wd}</span>
              <span className="text-[10px] tabular-nums text-text-faint">{dm}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
