"use client";

import type { ReactNode } from "react";
import { cn, useLanguage, type TranslationKey } from "@dawood/shared";

// Titled, tinted container for a chart body. A top accent rail + tick + corner
// glow make each chart read as its own colored panel that lifts on hover.
export function ChartCard({
  titleKey,
  subKey,
  accent = "var(--color-accent)",
  delay = 0,
  children,
  className,
}: {
  titleKey: TranslationKey;
  subKey?: TranslationKey;
  accent?: string;
  delay?: number;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useLanguage();
  return (
    <div
      className={cn(
        "animate-reveal group relative overflow-hidden rounded-2xl border border-border p-5 shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-md",
        delay === 1 ? "delay-1" : delay === 2 ? "delay-2" : delay === 3 ? "delay-3" : "",
        className,
      )}
      style={{ background: `linear-gradient(155deg, color-mix(in srgb, ${accent} 8%, var(--color-surface)) 0%, var(--color-surface) 56%)` }}
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
        className="pointer-events-none absolute -end-10 -top-10 h-28 w-28 rounded-full opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-35"
        style={{ background: accent }}
        aria-hidden
      />
      <div className="relative mb-5 flex items-center gap-2.5">
        {/* tokenized accent tick */}
        <span className="h-8 w-1.5 rounded-full" style={{ background: `linear-gradient(to bottom, ${accent}, color-mix(in srgb, ${accent} 35%, transparent))` }} aria-hidden />
        <div className="min-w-0">
          <h3 className="font-display text-sm font-bold leading-tight tracking-tight text-text-primary">{t(titleKey)}</h3>
          {subKey && <p className="t-caption mt-0.5">{t(subKey)}</p>}
        </div>
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
