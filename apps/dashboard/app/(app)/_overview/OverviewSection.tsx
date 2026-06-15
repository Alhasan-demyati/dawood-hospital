"use client";

import type { ReactNode } from "react";
import { useLanguage, type TranslationKey } from "@dawood/shared";
import { toArabicIndicDigits } from "@/lib/format";

// Editorial section header used across the Overview: a monospaced-feel index
// numeral, the localized title, a gradient hairline that fills the row, and an
// optional muted meta string on the trailing edge. Header-only — siblings render
// the section body — so it never interferes with shared SectionTitle elsewhere.
export function OverviewSection({
  index,
  titleKey,
  metaKey,
  meta,
  children,
}: {
  index: number;
  titleKey: TranslationKey;
  metaKey?: TranslationKey;
  meta?: string;
  children?: ReactNode;
}) {
  const { lang, t } = useLanguage();
  const idx = String(index).padStart(2, "0");
  const idxLabel = lang === "ar" ? toArabicIndicDigits(idx) : idx;
  const resolvedMeta = meta ?? (metaKey ? t(metaKey) : undefined);

  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="t-numeral text-xs leading-none text-accent-2" aria-hidden>
        {idxLabel}
      </span>
      <h2 className="t-eyebrow text-text-primary">{t(titleKey)}</h2>
      <span
        className="h-px flex-1"
        style={{
          background: `linear-gradient(${lang === "ar" ? "to left" : "to right"}, color-mix(in srgb, var(--color-border-strong) 95%, transparent), transparent)`,
        }}
        aria-hidden
      />
      {resolvedMeta && (
        <span className="t-caption hidden sm:inline">{resolvedMeta}</span>
      )}
      {children}
    </div>
  );
}
