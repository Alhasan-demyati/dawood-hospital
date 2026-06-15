"use client";

import type { ReactNode } from "react";
import { useLanguage, type TranslationKey } from "@dawood/shared";

// Editorial page masthead: an optional gold-ticked kicker, a confident display
// title, an optional muted subtitle, and a right-aligned actions slot (the
// RefreshButton lives there). Closed by a refined dual hairline — a short gold
// lead-in fading into an emerald rule. Accepts i18n keys (resolved here) or
// plain strings; fully backward compatible.
export function PageHeader({
  kickerKey,
  titleKey,
  title,
  subtitleKey,
  subtitle,
  actions,
}: {
  kickerKey?: TranslationKey;
  titleKey?: TranslationKey;
  title?: string;
  subtitleKey?: TranslationKey;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const { t } = useLanguage();
  const resolvedKicker = kickerKey ? t(kickerKey) : undefined;
  const resolvedTitle = title ?? (titleKey ? t(titleKey) : "");
  const resolvedSubtitle = subtitle ?? (subtitleKey ? t(subtitleKey) : undefined);

  return (
    <header className="animate-reveal relative mb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          {/* Kicker — gold tick + tracked label (RTL-safe via .t-eyebrow) */}
          {resolvedKicker && (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rotate-45 rounded-[2px] bg-accent-2 shadow-sm" aria-hidden />
              <span className="t-eyebrow text-text-muted">{resolvedKicker}</span>
            </div>
          )}
          <h1 className="t-display-md text-text-primary">{resolvedTitle}</h1>
          {resolvedSubtitle && <p className="t-body-sm text-text-muted">{resolvedSubtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      {/* Dual hairline: a gold lead-in fading into an emerald rule (logical-start). */}
      <div className="mt-5 flex items-center gap-0" aria-hidden>
        <span className="h-px w-14 bg-accent-2" />
        <span
          className="h-px flex-1"
          style={{ background: "linear-gradient(to right, transparent, color-mix(in srgb, var(--color-accent) 42%, transparent) 45%, transparent)" }}
        />
      </div>
    </header>
  );
}
