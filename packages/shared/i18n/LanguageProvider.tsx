"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { dict, type TranslationKey } from "./dictionary";
import { dirFor, type Lang, type LanguageContextValue } from "./types";

export const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "dawood.lang";

export function LanguageProvider({
  children,
  defaultLang = "ar",
}: {
  children: ReactNode;
  defaultLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(defaultLang);

  // Hydrate from a previously stored preference (client only). Also reconcile
  // the <html> lang/dir attributes (the server renders the default), so a
  // reloaded EN session stays LTR and language-aware CSS (e.g. .t-eyebrow) keys
  // off the correct lang.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "ar" || stored === "en") {
      setLangState(stored);
      document.documentElement.setAttribute("lang", stored);
      document.documentElement.setAttribute("dir", dirFor(stored));
    }
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.setAttribute("lang", next);
    document.documentElement.setAttribute("dir", dirFor(next));
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const next: Lang = prev === "ar" ? "en" : "ar";
      window.localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.setAttribute("lang", next);
      document.documentElement.setAttribute("dir", dirFor(next));
      return next;
    });
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const t = (key: TranslationKey): string => dict[lang][key] ?? dict.ar[key] ?? key;
    return { lang, dir: dirFor(lang), setLang, toggleLang, t };
  }, [lang, setLang, toggleLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
