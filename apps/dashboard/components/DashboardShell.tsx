"use client";

import { useState, type ReactNode } from "react";
import { LanguageToggle, ThemeToggle, useLanguage } from "@dawood/shared";
import { Sidebar, type SidebarStats } from "./Sidebar";

// App shell: drawer sidebar + a sticky top bar that holds the menu button
// (mobile) and the language / theme toggles (top, always reachable). Owns the
// drawer open-state shared between the top bar's menu button and the Sidebar.
export function DashboardShell({ stats, children }: { stats: SidebarStats; children: ReactNode }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <div className="app-bg flex min-h-screen">
      <Sidebar stats={stats} open={open} onClose={() => setOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-30 flex items-center gap-3 border-b border-border px-4 py-3 backdrop-blur md:px-10"
          style={{ background: "color-mix(in srgb, var(--color-surface) 82%, transparent)" }}
        >
          {/* Mobile: open the drawer */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-primary shadow-sm transition hover:bg-accent-soft md:hidden"
            aria-label={t("nav_overview")}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          {/* Mobile brand (sidebar is hidden on mobile) */}
          <div className="flex min-w-0 items-center gap-2 md:hidden">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-white shadow-sm">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span className="truncate font-display text-sm font-bold text-text-primary">{t("dashboard_title")}</span>
          </div>

          {/* Toggles — pinned to the end, on every screen */}
          <div className="ms-auto flex shrink-0 items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        <main className="min-w-0 flex-1 p-5 md:p-10">{children}</main>
      </div>
    </div>
  );
}
