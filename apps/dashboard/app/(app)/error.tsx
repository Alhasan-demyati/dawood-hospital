"use client";

import { useLanguage } from "@dawood/shared";

// Per-route error boundary — a small Arabic banner instead of crashing the
// whole dashboard (step-08 convention).
export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-md border border-danger bg-surface p-4 text-sm text-danger">
      <span>{t("common_error")}</span>{" "}
      <button type="button" onClick={reset} className="font-medium underline">
        {t("refresh")}
      </button>
    </div>
  );
}
