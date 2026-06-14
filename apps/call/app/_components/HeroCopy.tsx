// Hero title + subtitle. "use client" because it reads translated copy from the
// client-only LanguageProvider so the language toggle updates it live.
"use client";

import { useLanguage } from "@dawood/shared";

export function HeroCopy() {
  const { t } = useLanguage();

  return (
    <div className="animate-reveal flex flex-col items-center gap-4 text-center">
      {/* eyebrow — live persona chip */}
      <span
        className="inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-text-muted shadow-sm backdrop-blur"
        style={{ background: "color-mix(in srgb, var(--color-surface) 70%, transparent)" }}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
        {t("call_eyebrow")}
      </span>

      <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-text-primary sm:text-[3.25rem]">
        {t("callPage_title")}
      </h1>

      {/* gold underline flourish */}
      <span
        className="h-1 w-16 rounded-full"
        style={{ background: "linear-gradient(to left, var(--color-accent), var(--color-accent-2))" }}
        aria-hidden
      />

      <p className="max-w-lg text-base leading-relaxed text-text-muted sm:text-lg">
        {t("callPage_subtitle")}
      </p>
    </div>
  );
}
