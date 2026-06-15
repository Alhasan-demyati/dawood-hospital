"use client";

import { useLanguage, type TranslationKey } from "@dawood/shared";

// Small localized sub-section heading (used across overview + detail pages).
export function SectionTitle({ titleKey, title }: { titleKey?: TranslationKey; title?: string }) {
  const { t } = useLanguage();
  return (
    <h2 className="t-eyebrow mb-3 text-text-muted">
      {title ?? (titleKey ? t(titleKey) : "")}
    </h2>
  );
}
