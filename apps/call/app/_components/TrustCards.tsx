// Three reassurance cards (privacy / 24-7 / bilingual). "use client" because the
// labels come from the client-only LanguageProvider so they switch with the toggle.
"use client";

import type { ComponentType, SVGProps } from "react";
import { useLanguage, type TranslationKey } from "@dawood/shared";

type IconProps = SVGProps<SVGSVGElement>;

function ShieldIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} {...props}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GlobeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </svg>
  );
}

const CARDS: { key: TranslationKey; Icon: ComponentType<IconProps>; tint: string; delay: string }[] = [
  { key: "trust_privacy", Icon: ShieldIcon, tint: "var(--color-accent)", delay: "delay-1" },
  { key: "trust_availability", Icon: ClockIcon, tint: "var(--color-accent-2)", delay: "delay-2" },
  { key: "trust_languages", Icon: GlobeIcon, tint: "var(--color-accent)", delay: "delay-3" },
];

export function TrustCards() {
  const { t } = useLanguage();

  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
      {CARDS.map(({ key, Icon, tint, delay }) => (
        <div
          key={key}
          className={`animate-reveal ${delay} group flex flex-col items-center gap-3.5 rounded-2xl border border-border p-5 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md`}
          style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${tint} 6%, var(--color-surface)), var(--color-surface))` }}
        >
          <span
            className="grid h-12 w-12 place-items-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-105"
            style={{ background: `color-mix(in srgb, ${tint} 16%, var(--color-surface))`, color: tint }}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <p className="text-xs leading-relaxed text-text-muted">{t(key)}</p>
        </div>
      ))}
    </div>
  );
}
