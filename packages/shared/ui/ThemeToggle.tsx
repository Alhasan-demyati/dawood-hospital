"use client";

import { useTheme } from "../theme/useTheme";
import { cn } from "../lib/utils";

/** Toggles light/dark theme. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "rounded-md border border-border px-3 py-1.5 text-sm text-text-primary transition hover:bg-accent-soft",
        className,
      )}
      aria-label="Toggle theme"
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
