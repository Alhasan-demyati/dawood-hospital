"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n/useLanguage";
import { LANGS } from "../i18n/dictionary";
import type { Lang, TranslationKey } from "../i18n/types";
import { cn } from "../lib/utils";

/**
 * Language picker. A bordered trigger shows the active language; the dropdown
 * lists every supported locale (Arabic / English / German) and calls setLang.
 * Closes on outside click or Escape. Option labels are the language autonyms.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, t, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const labelFor = (l: Lang) => t(`languageToggle_${l}` as TranslationKey);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text-primary transition hover:bg-accent-soft"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
      >
        {labelFor(lang)}
        <svg
          viewBox="0 0 24 24"
          className={cn("h-3.5 w-3.5 text-text-muted transition-transform", open && "rotate-180")}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute end-0 z-50 mt-1 min-w-[8rem] overflow-hidden rounded-md border border-border bg-surface-raised py-1 shadow-lg"
        >
          {LANGS.map((l) => (
            <li key={l}>
              <button
                type="button"
                role="option"
                aria-selected={l === lang}
                onClick={() => {
                  setLang(l);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3 py-1.5 text-start text-sm text-text-primary transition hover:bg-accent-soft",
                  l === lang && "bg-accent-soft font-semibold",
                )}
              >
                {labelFor(l)}
                {l === lang && (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5 text-accent"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
