"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SVGProps } from "react";
import { cn, useLanguage, type TranslationKey } from "@dawood/shared";
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

type IconProps = SVGProps<SVGSVGElement>;
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function GridIcon(p: IconProps) {
  return (<svg viewBox="0 0 24 24" {...stroke} {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>);
}
function PhoneIcon(p: IconProps) {
  return (<svg viewBox="0 0 24 24" {...stroke} {...p}><path d="M5 4h3l2 5-2 1a11 11 0 0 0 5 5l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>);
}
function CalendarIcon(p: IconProps) {
  return (<svg viewBox="0 0 24 24" {...stroke} {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4M9 14l2 2 4-4" /></svg>);
}
function HandoverIcon(p: IconProps) {
  return (<svg viewBox="0 0 24 24" {...stroke} {...p}><circle cx="9" cy="8" r="3" /><path d="M4 20a5 5 0 0 1 10 0M15 6l4 4M19 6l-4 4" /></svg>);
}
function SettingsIcon(p: IconProps) {
  return (<svg viewBox="0 0 24 24" {...stroke} {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></svg>);
}
function UsersIcon(p: IconProps) {
  return (<svg viewBox="0 0 24 24" {...stroke} {...p}><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M18 20a5 5 0 0 0-3-4.5" /></svg>);
}
function StackIcon(p: IconProps) {
  return (<svg viewBox="0 0 24 24" {...stroke} {...p}><path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5" /></svg>);
}
function CrossIcon(p: IconProps) {
  return (<svg viewBox="0 0 24 24" {...stroke} {...p}><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8v8M8 12h8" /></svg>);
}

const NAV: { href: string; key: TranslationKey; Icon: (p: IconProps) => JSX.Element }[] = [
  { href: "/", key: "nav_overview", Icon: GridIcon },
  { href: "/calls", key: "nav_calls", Icon: PhoneIcon },
  { href: "/visits", key: "nav_visits", Icon: CalendarIcon },
  { href: "/handovers", key: "nav_handovers", Icon: HandoverIcon },
  { href: "/settings", key: "nav_settings", Icon: SettingsIcon },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function StatRow({ Icon, label, value, color }: { Icon: (p: IconProps) => JSX.Element; label: string; value: string; color: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${color} 16%, var(--color-surface))`, color }}>
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span className="flex-1 truncate text-xs text-text-muted">{label}</span>
      <span className="text-sm font-bold tabular-nums" style={{ color }}>{value}</span>
    </li>
  );
}

export function Sidebar({ stats, open, onClose }: { stats: SidebarStats; open: boolean; onClose: () => void }) {
  const { lang, t } = useLanguage();
  const pathname = usePathname();
  const fmt = (n: number) => (lang === "ar" ? toArabicIndicDigits(String(n)) : String(n));

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, key, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition duration-200",
              active
                ? "bg-accent font-semibold text-white shadow-sm"
                : "text-text-muted hover:bg-accent-soft hover:text-text-primary",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            <span>{t(key)}</span>
          </Link>
        );
      })}
    </nav>
  );

  const pulse = (
    <div className="rounded-2xl border border-border bg-surface-2 p-3.5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-xs font-bold text-text-primary">{t("sidebar_pulse")}</span>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
          </span>
          {t("sidebar_live")}
        </span>
      </div>

      <div className="mb-3 rounded-xl p-3" style={{ background: "color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))" }}>
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="font-sans text-2xl font-bold tabular-nums text-accent">{fmt(stats.visits_today)}</span>
            <span className="text-[11px] text-text-muted">{t("sidebar_visits_today")}</span>
          </div>
          <CalendarIcon className="h-5 w-5 text-accent opacity-70" aria-hidden />
        </div>
      </div>

      <ul className="flex flex-col gap-2.5">
        <StatRow Icon={StackIcon} label={t("sidebar_visits_total")} value={fmt(stats.visits_total)} color="var(--color-accent)" />
        <StatRow Icon={UsersIcon} label={t("sidebar_patients")} value={fmt(stats.patients_total)} color="#0e7490" />
        <StatRow Icon={CrossIcon} label={t("sidebar_clinics")} value={fmt(stats.specialties_active)} color="var(--color-accent-2)" />
        <StatRow Icon={HandoverIcon} label={t("sidebar_handovers_open")} value={fmt(stats.handovers_open)} color="var(--color-warning)" />
      </ul>
    </div>
  );

  const footer = (
    <div className="mt-auto flex items-center gap-2 border-t border-border px-1 pt-4">
      <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
      <span className="text-[10px] font-medium text-text-muted">{t("sidebar_system_ok")}</span>
    </div>
  );

  return (
    <>
      {/* Mobile drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onClose} aria-hidden />
      )}

      <aside
        className={cn(
          "z-50 flex w-64 shrink-0 flex-col gap-4 overflow-y-auto border-e border-border bg-surface p-4",
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
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="absolute -end-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent-2" aria-hidden />
          </span>
          <span className="font-display text-sm font-bold leading-tight text-text-primary">{t("dashboard_title")}</span>
        </div>
        {nav}
        {pulse}
        {footer}
      </aside>
    </>
  );
}
