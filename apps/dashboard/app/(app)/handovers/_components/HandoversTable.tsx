"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn, useLanguage, type TranslationKey } from "@dawood/shared";
import type { HandoverDetail } from "@/lib/queries";
import { formatArabicDateTime } from "@/lib/format";
import { subscribeToHandovers } from "@/lib/realtime";

const REASON_KEY: Record<string, TranslationKey> = {
  consent_declined: "reason_consent_declined",
  out_of_scope: "reason_out_of_scope",
  customer_request: "reason_customer_request",
  low_confidence: "reason_low_confidence",
  repeated_failure: "reason_repeated_failure",
  patient_not_found: "reason_patient_not_found",
  safety: "reason_safety",
  specialty_unclear: "reason_specialty_unclear",
};
// Color category: safety/consent = danger; low-confidence/repeat = warning; rest = neutral.
const REASON_TONE: Record<string, string> = {
  safety: "text-danger",
  consent_declined: "text-danger",
  low_confidence: "text-warning",
  repeated_failure: "text-warning",
  patient_not_found: "text-warning",
  out_of_scope: "text-text-muted",
  customer_request: "text-accent",
  specialty_unclear: "text-text-muted",
};

function truncate(s: string, n = 120): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

export function HandoversTable({ rows }: { rows: HandoverDetail[] }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = subscribeToHandovers((row) => {
      setHighlightId(row.id);
      router.refresh();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setHighlightId(null), 2000);
    });
    return () => {
      unsub();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [router]);

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
            <th className="px-3 py-2 text-start font-medium">{t("col_triggered_at")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("col_reason")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("handovers_col_summary")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("col_target_agent")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("col_completed_at")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Fragment key={r.id}>
              <tr
                onClick={() => setExpanded((e) => (e === r.id ? null : r.id))}
                className={cn(
                  "cursor-pointer border-b border-border transition-colors hover:bg-accent-soft",
                  highlightId === r.id && "bg-accent-soft",
                )}
              >
                <td className="px-3 py-2 text-text-muted">{formatArabicDateTime(r.triggered_at)}</td>
                <td className="px-3 py-2">
                  <span className={cn("rounded-full border border-border px-2 py-0.5 text-xs", REASON_TONE[r.reason_code])}>
                    {REASON_KEY[r.reason_code] ? t(REASON_KEY[r.reason_code]) : r.reason_code}
                  </span>
                </td>
                <td className="px-3 py-2 text-text-primary" title={r.summary_ar}>{truncate(r.summary_ar)}</td>
                <td className="px-3 py-2 text-text-muted" dir="ltr">{r.target_agent_id || "—"}</td>
                <td className="px-3 py-2">
                  {r.completed_at ? (
                    <span className="text-text-muted">{formatArabicDateTime(r.completed_at)}</span>
                  ) : (
                    <span className="text-warning">{t("handover_status_open")}</span>
                  )}
                </td>
              </tr>
              {expanded === r.id && (
                <tr className="border-b border-border bg-background">
                  <td colSpan={5} className="p-4">
                    {r.summary_ar && <p className="mb-3 text-sm leading-relaxed text-text-primary">{r.summary_ar}</p>}
                    <div className="mb-1 text-xs font-medium text-text-muted">{t("handover_customer_data")}</div>
                    <pre dir="ltr" className="overflow-x-auto rounded bg-surface p-3 text-xs text-text-muted">
                      {JSON.stringify(r.customer_data ?? {}, null, 2)}
                    </pre>
                    <Link href={`/calls/${r.conversation_id}`} className="mt-3 inline-block text-sm font-medium text-accent underline">
                      {t("view_source_call")}
                    </Link>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
