"use client";

import Link from "next/link";
import { useLanguage, type TranslationKey } from "@dawood/shared";

// Thin glyph + Arabic message + optional CTA. Used for every empty list.
export function EmptyState({
  messageKey,
  message,
  ctaHref,
  ctaLabelKey,
}: {
  messageKey?: TranslationKey;
  message?: string;
  ctaHref?: string;
  ctaLabelKey?: TranslationKey;
}) {
  const { t } = useLanguage();
  const resolved = message ?? (messageKey ? t(messageKey) : t("empty_state_generic"));

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <svg viewBox="0 0 48 48" className="h-10 w-10 text-text-muted" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden>
        <rect x="9" y="11" width="30" height="26" rx="3" />
        <path d="M9 19h30M16 27h16M16 32h10" strokeLinecap="round" />
      </svg>
      <p className="max-w-sm text-sm text-text-muted">{resolved}</p>
      {ctaHref && ctaLabelKey && (
        <Link href={ctaHref} className="text-sm font-medium text-accent underline">
          {t(ctaLabelKey)}
        </Link>
      )}
    </div>
  );
}
