/* <!-- REVIEW WITH LEGAL --> consent copy must be vetted with Jordan MoH
   and Dawood Hospital legal counsel before going live. */
"use client";

import Link from "next/link";
import { useLanguage, MedicalGlyph } from "@dawood/shared";

// Non-blocking pre-call consent banner (POC scope: always shown).
export function ConsentBanner() {
  const { t } = useLanguage();

  return (
    <div
      role="note"
      className="animate-reveal flex w-full items-start gap-3 rounded-full border border-hairline bg-accent-soft px-4 py-2.5 text-text-primary shadow-sm backdrop-blur t-body-sm"
    >
      {/* <!-- REVIEW WITH LEGAL --> consent copy must be vetted before launch. */}
      <span className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-white shadow-sm" aria-hidden>
        <MedicalGlyph name="document" className="h-3.5 w-3.5" strokeWidth={2} />
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
