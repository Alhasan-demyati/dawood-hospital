import type { SVGProps } from "react";

/*
 * One registry of stroke glyphs, consolidating the inline SVGs that were
 * duplicated across the dashboard (Sidebar, BigNumber, ActivityFeedView) and
 * the call app. viewBox 24, painted by `currentColor`, configurable stroke.
 * Server-safe (no hooks) so it renders in RSC or client islands alike.
 */

export type GlyphName =
  | "cross"
  | "pulse"
  | "heart"
  | "stethoscope"
  | "phone"
  | "calendar"
  | "visit"
  | "handover"
  | "shield"
  | "smile"
  | "grid"
  | "settings"
  | "refresh"
  | "hospital"
  | "user"
  | "users"
  | "clock"
  | "globe"
  | "tool"
  | "document"
  | "sparkle"
  | "bone"
  | "search"
  | "filter";

// Each entry is the inner markup for a 24×24, fill=none, stroke=currentColor svg.
const PATHS: Record<GlyphName, string> = {
  cross: "M12 4.5v15M4.5 12h15",
  pulse: "M2 12h4l2.5-7 4 14 2.5-7H22",
  heart: "M12 20s-7-4.4-9.3-8.6A5.2 5.2 0 0 1 12 6a5.2 5.2 0 0 1 9.3 5.4C19 15.6 12 20 12 20z",
  stethoscope:
    "M6 3v6a4 4 0 0 0 8 0V3M10 17.5a4.5 4.5 0 0 0 4.5 4.5 4.5 4.5 0 0 0 4.5-4.5v-3M19 9.4a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8z",
  phone:
    "M5 4h3l2 5-2.4 1.5a11 11 0 0 0 5 5L15 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  calendar: "M4 6.5h16M8 3.5v4M16 3.5v4M5 5.5h14v15H5z",
  visit: "M5 5.5h14v15H5zM4 9.5h16M8 3.5v4M16 3.5v4M9 14l2 2 4-4",
  handover: "M7 8l-4 4 4 4M3 12h11M17 16l4-4-4-4M21 12H10",
  shield: "M12 3l7 3v5c0 4.6-3 7.7-7 9-4-1.3-7-4.4-7-9V6z M9 12l2 2 4-4",
  smile: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM8.5 14a4 4 0 0 0 7 0M9 10h.01M15 10h.01",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.2A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H1a2 2 0 1 1 0-4h.2A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3 1.6 1.6 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V7a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1z",
  refresh: "M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5",
  hospital: "M5 21V7l7-4 7 4v14M9 21v-5h6v5M12 7.5v4M10 9.5h4",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0",
  users:
    "M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.2a4 4 0 0 1 0 7.6M21.5 20a6.5 6.5 0 0 0-4-6",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 7.5V12l3 2",
  globe: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18",
  tool: "M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2-2 2.3-2.3z",
  document: "M6 3h7l5 5v13H6zM13 3v5h5M9 13h6M9 17h6",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
  bone: "M9 5.5a2 2 0 1 0-3.2 2.3L4 9.6a2 2 0 1 0 2.3 2.3l5.8-5.8a2 2 0 1 0 2.3-2.3l1.8-1.8A2 2 0 1 0 16.4 4z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  filter: "M3 5h18l-7 8v6l-4-2v-4z",
};

export function MedicalGlyph({
  name,
  strokeWidth = 1.7,
  className,
  ...rest
}: { name: GlyphName; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...rest}
    >
      <path d={PATHS[name] ?? PATHS.cross} />
    </svg>
  );
}
