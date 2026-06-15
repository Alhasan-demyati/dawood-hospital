import type { SVGProps } from "react";

/*
 * Bespoke empty-state illustrations, one per context. Structure paints with
 * `currentColor` (callers set it to the faint text tone); the gold heartbeat
 * accents are explicit (--color-accent-2). Server-safe.
 */

export type EmptyArtVariant =
  | "generic"
  | "calls"
  | "visits"
  | "handovers"
  | "transcript"
  | "chart";

const GOLD = "var(--color-accent-2)";

function Art({ variant, ...rest }: { variant: EmptyArtVariant } & SVGProps<SVGSVGElement>) {
  switch (variant) {
    case "calls":
      return (
        <svg viewBox="0 0 120 88" fill="none" aria-hidden {...rest}>
          <rect x="46" y="12" width="28" height="48" rx="7" stroke="currentColor" strokeWidth="2" />
          <line x1="55" y1="53" x2="65" y2="53" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M26 74h28l3-8 4.5 15 3.5-7h32" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "visits":
      return (
        <svg viewBox="0 0 120 88" fill="none" aria-hidden {...rest}>
          <rect x="32" y="20" width="56" height="46" rx="8" stroke="currentColor" strokeWidth="2" />
          <path d="M32 33h56" stroke="currentColor" strokeWidth="2" />
          <path d="M44 15v9M76 15v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M60 43v14M53 50h14" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "handovers":
      return (
        <svg viewBox="0 0 120 88" fill="none" aria-hidden {...rest}>
          <path d="M44 32H22M31 23l-9 9 9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M76 56h22M89 47l9 9-9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="60" cy="44" r="7" stroke={GOLD} strokeWidth="2" />
          <path d="M60 41v6M57 44h6" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "transcript":
      return (
        <svg viewBox="0 0 120 88" fill="none" aria-hidden {...rest}>
          <path d="M26 20h40a6 6 0 0 1 6 6v13a6 6 0 0 1-6 6H42l-9 8v-8h-7a6 6 0 0 1-6-6V26a6 6 0 0 1 6-6z" stroke="currentColor" strokeWidth="2" strokeDasharray="4 5" strokeLinejoin="round" />
          <path d="M74 48h18a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-5l-6 6v-6h-7a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4z" stroke={GOLD} strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "chart":
      return (
        <svg viewBox="0 0 120 88" fill="none" aria-hidden {...rest}>
          <path d="M30 16v52h64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M38 60h50" stroke="currentColor" strokeWidth="2" strokeDasharray="3 6" strokeLinecap="round" />
          <path d="M38 46h12l4-7 5 14 4-7h21" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 120 88" fill="none" aria-hidden {...rest}>
          <rect x="34" y="18" width="52" height="44" rx="9" stroke="currentColor" strokeWidth="2" strokeDasharray="4 5" />
          <path d="M60 30v18M51 39h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M30 74h22l3-7 4.5 14 3.5-7h27" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

export function EmptyArt({
  variant = "generic",
  className,
}: {
  variant?: EmptyArtVariant;
  className?: string;
}) {
  return <Art variant={variant} className={className} />;
}
