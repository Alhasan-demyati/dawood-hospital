// Three reassurance cards (privacy / 24-7 / bilingual). "use client" because the
// labels come from the client-only LanguageProvider so they switch with the toggle.
"use client";

import { useLanguage, MedicalGlyph, type TranslationKey, type GlyphName } from "@dawood/shared";

const CARDS: { key: TranslationKey; glyph: GlyphName; tint: string; delay: string }[] = [
  { key: "trust_privacy", glyph: "shield", tint: "var(--color-accent)", delay: "delay-1" },
  { key: "trust_availability", glyph: "clock", tint: "var(--color-accent-2)", delay: "delay-2" },
  { key: "trust_languages", glyph: "globe", tint: "var(--color-accent)", delay: "delay-3" },
];

export function TrustCards() {
  const { t } = useLanguage();

  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
      {CARDS.map(({ key, glyph, tint, delay }) => (
        <div
          key={key}
          className={`animate-reveal ${delay} group relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-border p-5 text-center shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-md`}
          style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${tint} 6%, var(--color-surface)), var(--color-surface))` }}
        >
          {/* inset lit edge */}
          <span
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{ boxShadow: "var(--highlight-top)" }}
            aria-hidden
          />
          <span
            className="relative grid h-12 w-12 place-items-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-105"
            style={{ background: `color-mix(in srgb, ${tint} 16%, var(--color-surface))`, color: tint }}
          >
            <MedicalGlyph name={glyph} className="h-5 w-5" />
          </span>
          <p className="relative max-w-[22ch] text-text-muted t-body-sm">{t(key)}</p>
        </div>
      ))}
    </div>
  );
}
