// Hero title + subtitle. "use client" because it reads translated copy from the
// client-only LanguageProvider so the language toggle updates it live.
"use client";

import { useLanguage, VitalLine } from "@dawood/shared";

export function HeroCopy() {
  const { t } = useLanguage();

  return (
    <div className="animate-reveal flex flex-col items-center gap-4 text-center">
      {/* eyebrow — live persona chip */}
      <span
        className="t-eyebrow inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-text-muted shadow-sm backdrop-blur"
        style={{ background: "color-mix(in srgb, var(--color-surface) 70%, transparent)" }}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
        {t("call_eyebrow")}
      </span>

      <h1 className="t-display-xl text-text-primary">
        {t("callPage_title")}
      </h1>

      {/* gold underline flourish — drawn EKG signature */}
      <span className="block w-16" aria-hidden>
        <VitalLine mode="draw" height={14} strokeWidth={2.5} />
      </span>

      <p className="max-w-lg text-text-muted t-body">
        {t("callPage_subtitle")}
      </p>
    </div>
  );
}
