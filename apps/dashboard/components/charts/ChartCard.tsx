"use client";

import type { ReactNode } from "react";
import { cn, useLanguage, type TranslationKey } from "@dawood/shared";

// Titled, tinted container for a chart body. Accent drives the title rule + a
// faint corner glow so each chart reads as its own colored panel.
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
        "animate-reveal group relative overflow-hidden rounded-2xl border border-border p-5 shadow-sm transition duration-300 hover:shadow-md",
        delay === 1 ? "delay-1" : delay === 2 ? "delay-2" : delay === 3 ? "delay-3" : "",
        className,
      )}
      style={{ background: `linear-gradient(150deg, color-mix(in srgb, ${accent} 7%, var(--color-surface)) 0%, var(--color-surface) 58%)` }}
    >
      <span
        className="pointer-events-none absolute -end-10 -top-10 h-28 w-28 rounded-full opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-35"
        style={{ background: accent }}
        aria-hidden
      />
      <div className="relative mb-5 flex items-center gap-2.5">
        <span className="h-8 w-1.5 rounded-full" style={{ background: accent }} aria-hidden />
        <div className="min-w-0">
          <h3 className="font-display text-sm font-bold leading-tight text-text-primary">{t(titleKey)}</h3>
          {subKey && <p className="mt-0.5 text-xs text-text-muted">{t(subKey)}</p>}
        </div>
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
