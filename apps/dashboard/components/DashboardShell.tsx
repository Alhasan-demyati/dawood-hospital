"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  LanguageToggle,
  ThemeToggle,
  MedicalGlyph,
  useLanguage,
  type TranslationKey,
} from "@dawood/shared";
import { Sidebar, type SidebarStats } from "./Sidebar";

// Active route → its nav label, for the mobile top-bar title.
const ROUTE_TITLE: { match: (p: string) => boolean; key: TranslationKey }[] = [
  { match: (p) => p === "/", key: "nav_overview" },
  { match: (p) => p.startsWith("/calls"), key: "nav_calls" },
  { match: (p) => p.startsWith("/visits"), key: "nav_visits" },
  { match: (p) => p.startsWith("/handovers"), key: "nav_handovers" },
  { match: (p) => p.startsWith("/settings"), key: "nav_settings" },
];

// App shell: drawer sidebar + a sticky top bar that holds the menu button
// (mobile) and the language / theme toggles (top, always reachable). Owns the
// drawer open-state shared between the top bar's menu button and the Sidebar.
export function DashboardShell({ stats, children }: { stats: SidebarStats; children: ReactNode }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const activeKey = ROUTE_TITLE.find((r) => r.match(pathname))?.key ?? "nav_overview";

  return (
    <div className="app-bg flex min-h-screen">
      <Sidebar stats={stats} open={open} onClose={() => setOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-30 flex items-center gap-3 border-b border-hairline px-4 py-3 backdrop-blur-md md:px-10"
          style={{ background: "color-mix(in srgb, var(--color-surface) 78%, transparent)" }}
        >
          {/* faint atmospheric wash so the bar reads as a layered sheet */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ background: "var(--gradient-mesh)" }}
          />

          {/* Mobile: open the drawer */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-primary shadow-sm transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            aria-label={t("nav_section")}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          {/* Mobile brand + active page (sidebar is hidden on mobile) */}
          <div className="relative z-10 flex min-w-0 items-center gap-2 md:hidden">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-white shadow-sm">
              <MedicalGlyph name="cross" className="h-4 w-4" strokeWidth={2.4} />
            </span>
            <span className="truncate font-display text-sm font-bold text-text-primary">{t(activeKey)}</span>
          </div>

          {/* Toggles — pinned to the end, on every screen */}
          <div className="relative z-10 ms-auto flex shrink-0 items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        <main className="min-w-0 flex-1 p-5 md:p-10">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
