"use client";

import Link from "next/link";
import {
  useLanguage,
  EmptyArt,
  MedicalGlyph,
  type TranslationKey,
  type EmptyArtVariant,
} from "@dawood/shared";

// Bespoke empty-state illustration + Arabic message + optional CTA.
// Used for every empty list. The art inherits the faint text tone; its gold
// heartbeat accents are baked in. Centered, generously padded, entrance reveal.
export function EmptyState({
  messageKey,
  message,
  ctaHref,
  ctaLabelKey,
  variant = "generic",
}: {
  messageKey?: TranslationKey;
  message?: string;
  ctaHref?: string;
  ctaLabelKey?: TranslationKey;
  variant?: EmptyArtVariant;
}) {
  const { t } = useLanguage();
  const resolved = message ?? (messageKey ? t(messageKey) : t("empty_state_generic"));

  return (
    <div className="animate-reveal relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-dashed border-border bg-surface px-8 py-14 text-center">
      {/* inset top highlight — a crafted, lit edge even on the dashed shell */}
      <span
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ boxShadow: "var(--highlight-top)" }}
        aria-hidden
      />
      {/* bespoke illustration — inherits the faint tone, gold accents baked in */}
      <span className="relative text-text-faint" aria-hidden>
        <EmptyArt variant={variant} className="h-20 w-auto" />
      </span>
      <p className="t-body-sm relative max-w-sm text-text-muted">{resolved}</p>
      {ctaHref && ctaLabelKey && (
        <Link
          href={ctaHref}
          className="group relative inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-2 px-4 py-1.5 text-sm font-semibold text-accent shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t(ctaLabelKey)}
          <MedicalGlyph
            name="sparkle"
            className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110"
            strokeWidth={1.8}
          />
        </Link>
      )}
    </div>
  );
}
