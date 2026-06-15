"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn, useLanguage, MedicalGlyph } from "@dawood/shared";

// Re-runs the current route's server components. Glyph spins while pending.
export function RefreshButton({ className }: { className?: string }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary shadow-sm transition hover:bg-surface-2 disabled:opacity-60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <MedicalGlyph
        name="refresh"
        className={cn("h-4 w-4", pending && "animate-spin")}
        strokeWidth={1.8}
        aria-hidden
      />
      {t("refresh")}
    </button>
  );
}
