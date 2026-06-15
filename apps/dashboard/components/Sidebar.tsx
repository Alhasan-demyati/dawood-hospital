"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  cn,
  useLanguage,
  MedicalGlyph,
  VitalLine,
  type TranslationKey,
  type GlyphName,
} from "@dawood/shared";
import { toArabicIndicDigits } from "@/lib/format";

// Structural type — must NOT import from @/lib/queries (that pulls in
// next/headers and would break the client bundle). The layout passes a matching
// object fetched server-side.
export type SidebarStats = {
  visits_total: number;
  visits_today: number;
  patients_total: number;
  specialties_active: number;
  handovers_open: number;
  conversations_total: number;
};

const NAV: { href: string; key: TranslationKey; glyph: GlyphName }[] = [
  { href: "/", key: "nav_overview", glyph: "grid" },
  { href: "/calls", key: "nav_calls", glyph: "phone" },
  { href: "/visits", key: "nav_visits", glyph: "visit" },
  { href: "/handovers", key: "nav_handovers", glyph: "handover" },
  { href: "/settings", key: "nav_settings", glyph: "settings" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function StatRow({
  glyph,
  label,
  value,
  color,
}: {
  glyph: GlyphName;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
        style={{
          background: `color-mix(in srgb, ${color} 16%, var(--color-surface))`,
          color,
          boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 26%, transparent)`,
        }}
      >
        <MedicalGlyph name={glyph} className="h-3.5 w-3.5" strokeWidth={1.8} />
      </span>
      <span className="flex-1 truncate text-xs text-text-muted">{label}</span>
      <span className="t-numeral text-sm" style={{ color }}>
        {value}
      </span>
    </li>
  );
}

export function Sidebar({
  stats,
  open,
  onClose,
}: {
  stats: SidebarStats;
  open: boolean;
  onClose: () => void;
}) {
  const { lang, t } = useLanguage();
  const pathname = usePathname();
  const fmt = (n: number) => (lang === "ar" ? toArabicIndicDigits(String(n)) : String(n));

  const nav = (
    <nav className="flex flex-col gap-1">
      <span className="t-eyebrow mb-1.5 px-3 text-text-faint">{t("nav_section")}</span>
      {NAV.map(({ href, key, glyph }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group/nav relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition duration-200",
              active
                ? "bg-accent font-semibold text-white shadow-card"
                : "text-text-muted hover:bg-surface-2 hover:text-text-primary",
            )}
          >
            {/* gold active rail on the inline-start edge */}
            {active && (
              <span
                className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-accent-2"
                aria-hidden
              />
            )}
            <MedicalGlyph
              name={glyph}
              className={cn(
                "h-5 w-5 shrink-0 transition-transform duration-200",
                !active && "group-hover/nav:scale-110",
              )}
            />
            <span>{t(key)}</span>
          </Link>
        );
      })}
    </nav>
  );

  const pulse = (
    <div className="rounded-2xl border border-hairline bg-surface-3 p-3.5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="t-eyebrow text-text-primary">{t("sidebar_pulse")}</span>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
          </span>
          {t("sidebar_live")}
        </span>
      </div>

      {/* Featured tile — visits today, crowned by the signature vital line. */}
      <div
        className="relative mb-3 overflow-hidden rounded-xl border border-hairline p-3"
        style={{ background: "color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))" }}
      >
        <div className="absolute inset-x-0 top-0 opacity-70">
          <VitalLine mode="static" height={14} />
        </div>
        <div className="mt-2 flex items-end justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="t-numeral text-2xl text-accent">{fmt(stats.visits_today)}</span>
            <span className="text-[11px] text-text-muted">{t("sidebar_visits_today")}</span>
          </div>
          <MedicalGlyph name="calendar" className="h-5 w-5 text-accent opacity-70" />
        </div>
      </div>

      <ul className="flex flex-col gap-2.5">
        <StatRow glyph="hospital" label={t("sidebar_visits_total")} value={fmt(stats.visits_total)} color="var(--color-accent)" />
        <StatRow glyph="users" label={t("sidebar_patients")} value={fmt(stats.patients_total)} color="var(--chart-2)" />
        <StatRow glyph="cross" label={t("sidebar_clinics")} value={fmt(stats.specialties_active)} color="var(--color-accent-2)" />
        <StatRow glyph="handover" label={t("sidebar_handovers_open")} value={fmt(stats.handovers_open)} color="var(--color-warning)" />
      </ul>
    </div>
  );

  const footer = (
    <div className="mt-auto border-t border-hairline px-1 pt-4">
      <div className="flex items-center gap-2">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-50" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
        </span>
        <span className="text-[10px] font-medium text-text-muted">{t("sidebar_system_ok")}</span>
      </div>
      <span className="mt-2 block text-[10px] font-medium uppercase tracking-[0.16em] text-text-faint">
        {t("powered_by")}
      </span>
    </div>
  );

  return (
    <>
      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "z-50 flex w-64 shrink-0 flex-col gap-4 overflow-y-auto border-e border-border bg-surface p-4 shadow-pop md:shadow-none",
          "fixed inset-y-0 transition-transform",
          // md+: static & always visible. `!` important beats the higher-specificity
          // [dir=rtl]/[dir=ltr] translate rules below (which would otherwise win).
          "md:!static md:!translate-x-0",
          open ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full",
        )}
        style={{ insetInlineStart: 0 }}
      >
        <div className="flex items-center gap-2.5 px-1 py-1">
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent text-white shadow-md">
            <MedicalGlyph name="cross" className="h-5 w-5" strokeWidth={2.2} />
            <span
              className="absolute -end-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent-2"
              aria-hidden
            />
          </span>
          <span className="font-display text-sm font-bold leading-tight text-text-primary">
            {t("dashboard_title")}
          </span>
        </div>
        {nav}
        {pulse}
        {footer}
      </aside>
    </>
  );
}
