import type { dict, TranslationKey } from "./dictionary";

export type Lang = keyof typeof dict; // "ar" | "en" | "de"
export type Dir = "rtl" | "ltr";

export type { TranslationKey };

export interface LanguageContextValue {
  lang: Lang;
  dir: Dir;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
}

// Arabic is the only RTL locale; English + German render LTR.
export const dirFor = (lang: Lang): Dir => (lang === "ar" ? "rtl" : "ltr");
