"use client";

import { useLanguage, VitalLine, SectionMotif } from "@dawood/shared";
import { RefreshButton } from "@/components/editorial/RefreshButton";

// The Overview broadsheet masthead: a tracked-out kicker, a confident display
// title, a live Amman dateline + pulse, and the refresh action. Date strings are
// pre-formatted server-side (one per language) so there's no hydration drift;
// we select by the live `lang` here.
export function OverviewMasthead({ date }: { date: { ar: string; en: string } }) {
  const { lang, t } = useLanguage();
  const dateLabel = lang === "ar" ? date.ar : date.en;

  return (
    <header className="animate-reveal relative mb-9">
      {/* faint pulse watermark in the trailing corner */}
      <SectionMotif name="pulse" size={150} className="-top-6 -end-4" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {/* Kicker — gold tick + RTL-safe eyebrow label */}
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rotate-45 rounded-[2px] bg-accent-2 shadow-sm" aria-hidden />
            <span className="t-eyebrow text-text-muted">{t("overview_kicker")}</span>
          </div>

          {/* Title */}
          <h1 className="t-display-lg text-text-primary">{t("nav_overview")}</h1>

          {/* Dateline + live pulse */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="inline-flex items-center gap-2 text-sm text-text-muted">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-accent" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="5" width="18" height="16" rx="2.5" />
                <path d="M3 9h18M8 3v4M16 3v4" />
              </svg>
              {dateLabel}
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-success"
              style={{ background: "color-mix(in srgb, var(--color-success) 14%, var(--color-surface))" }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              {t("overview_live_label")}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <RefreshButton />
        </div>
      </div>

      {/* Signature underline: a short gold lead-in, then the EKG vital line drawn
          over a thin hairline (logical-start). */}
      <div className="relative mt-5 flex items-center gap-3" aria-hidden>
        <span className="h-px w-14 shrink-0 bg-accent-2" />
        <span className="relative flex-1">
          <span
            className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2"
            style={{ background: "linear-gradient(to right, color-mix(in srgb, var(--color-border) 80%, transparent), transparent)" }}
          />
          <span className="relative block">
            <VitalLine mode="draw" height={18} />
          </span>
        </span>
      </div>
    </header>
  );
}
