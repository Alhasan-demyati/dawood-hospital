/* <!-- REVIEW WITH LEGAL --> consent copy must be vetted with Jordan MoH
   and Dawood Hospital legal counsel before going live. */
"use client";

import Link from "next/link";
import { useLanguage } from "@dawood/shared";

// Non-blocking pre-call consent banner (POC scope: always shown).
export function ConsentBanner() {
  const { t } = useLanguage();

  return (
    <div
      role="note"
      className="animate-reveal flex w-full items-start gap-3 rounded-2xl border border-border px-4 py-3.5 text-xs leading-relaxed text-text-primary shadow-sm backdrop-blur"
      style={{ background: "color-mix(in srgb, var(--color-accent-soft) 70%, transparent)" }}
    >
      {/* <!-- REVIEW WITH LEGAL --> consent copy must be vetted before launch. */}
      <span className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-accent text-white shadow-sm" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8h.01M11 12h1v4h1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <p className="pt-0.5">
        <span>{t("consent_banner")}</span>{" "}
        <Link href="/privacy" className="font-semibold text-accent underline decoration-accent underline-offset-2">
          {t("consent_learn_more")}
        </Link>
      </p>
    </div>
  );
}
