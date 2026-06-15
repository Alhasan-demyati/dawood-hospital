import type { CSSProperties } from "react";

/*
 * VitalLine — the platform signature. A single EKG/heartbeat trace reused
 * everywhere (masthead underline, loading bar, card hover, empty-state flatline).
 * Gold by default. `draw` strokes once on entrance; `loop` runs a travelling
 * pulse; `static` just shows the line. Stretches to its container width with a
 * non-scaling stroke, so it stays crisp at any size. Server-safe.
 */

type Mode = "draw" | "loop" | "static";

// One calm beat near the middle of a 300-wide baseline (pathLength = 300).
const D =
  "M0 14 H104 l5 -1 l4 -9 l6 19 l5 -21 l4 12 l4 1 H300";

export function VitalLine({
  className,
  color = "var(--color-accent-2)",
  mode = "draw",
  strokeWidth = 2,
  height = 22,
}: {
  className?: string;
  color?: string;
  mode?: Mode;
  strokeWidth?: number;
  height?: number | string;
}) {
  const animClass = mode === "loop" ? "vital-loop" : mode === "draw" ? "vital-draw" : "";
  const style: CSSProperties = { width: "100%", height, display: "block" };
  return (
    <svg
      viewBox="0 0 300 28"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden
      style={style}
      className={className}
    >
      <path
        d={D}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        pathLength={300}
        className={animClass}
      />
    </svg>
  );
}
