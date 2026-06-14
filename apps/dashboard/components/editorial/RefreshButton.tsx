"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn, useLanguage } from "@dawood/shared";

// Re-runs the current route's server components. Icon spins while pending.
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
        "inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-text-primary transition hover:bg-accent-soft disabled:opacity-60",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className={cn("h-4 w-4", pending && "animate-spin")}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        aria-hidden
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {t("refresh")}
    </button>
  );
}
