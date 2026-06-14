"use client";

import type { ReactNode } from "react";
import { useLanguage, type TranslationKey } from "@dawood/shared";

// Editorial page header: title + optional subtitle + right-aligned actions,
// with a thin rule below. Accepts i18n keys (resolved here) or plain strings.
export function PageHeader({
  titleKey,
  title,
  subtitleKey,
  subtitle,
  actions,
}: {
  titleKey?: TranslationKey;
  title?: string;
  subtitleKey?: TranslationKey;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const { t } = useLanguage();
  const resolvedTitle = title ?? (titleKey ? t(titleKey) : "");
  const resolvedSubtitle = subtitle ?? (subtitleKey ? t(subtitleKey) : undefined);

  return (
    <header className="mb-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-stretch gap-3">
          {/* gradient accent bar */}
          <span
            className="w-1.5 shrink-0 rounded-full"
            style={{ background: "linear-gradient(to bottom, var(--color-accent), color-mix(in srgb, var(--color-accent) 40%, transparent))" }}
            aria-hidden
          />
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">{resolvedTitle}</h1>
            {resolvedSubtitle && <p className="text-sm text-text-muted">{resolvedSubtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {/* gradient rule */}
      <div
        className="mt-4 h-px w-full"
        style={{ background: "linear-gradient(to left, transparent, color-mix(in srgb, var(--color-accent) 45%, transparent), transparent)" }}
        aria-hidden
      />
    </header>
  );
}
