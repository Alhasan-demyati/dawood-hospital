"use client";

import { useLanguage } from "../i18n/useLanguage";
import { cn } from "../lib/utils";

/** Toggles between Arabic and English; the label shows the language to switch TO. */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, t, toggleLang } = useLanguage();
  const label = lang === "ar" ? t("languageToggle_en") : t("languageToggle_ar");

  return (
    <button
      type="button"
      onClick={toggleLang}
      className={cn(
        "rounded-md border border-border px-3 py-1.5 text-sm text-text-primary transition hover:bg-accent-soft",
        className,
      )}
      aria-label="Toggle language"
    >
      {label}
    </button>
  );
}
