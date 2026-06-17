"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn, useLanguage, MedicalGlyph, type TranslationKey } from "@dawood/shared";
import type { HandoverDetail } from "@/lib/queries";
import { formatDateTime } from "@/lib/format";
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
// Map each tone text-class to the CSS var it draws from, so the pill can mix a
// faint translucent well + hairline from the same color (slash-opacity on these
// preset vars compiles to nothing — color-mix is the only honest path).
const TONE_VAR: Record<string, string> = {
  "text-danger": "var(--color-danger)",
  "text-warning": "var(--color-warning)",
  "text-accent": "var(--color-accent)",
  "text-text-muted": "var(--color-text-muted)",
};

function truncate(s: string, n = 120): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

export function HandoversTable({ rows }: { rows: HandoverDetail[] }) {
  const router = useRouter();
  const { t, lang } = useLanguage();
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
    <div className="relative overflow-x-auto rounded-2xl border border-border bg-surface shadow-card">
      {/* inset top highlight — a crafted, lit edge */}
      <span className="pointer-events-none absolute inset-0 z-10 rounded-[inherit]" style={{ boxShadow: "var(--highlight-top)" }} aria-hidden />
      <table className="w-full border-collapse text-sm">
        <thead>
          {/* recessed header well */}
          <tr className="border-b border-hairline bg-surface-3 text-start">
            <th className="t-eyebrow px-3.5 py-2.5 text-start font-medium text-text-faint" />
            <th className="t-eyebrow px-3.5 py-2.5 text-start font-medium text-text-faint">{t("col_triggered_at")}</th>
            <th className="t-eyebrow px-3.5 py-2.5 text-start font-medium text-text-faint">{t("col_reason")}</th>
            <th className="t-eyebrow px-3.5 py-2.5 text-start font-medium text-text-faint">{t("handovers_col_summary")}</th>
            <th className="t-eyebrow px-3.5 py-2.5 text-start font-medium text-text-faint">{t("col_target_agent")}</th>
            <th className="t-eyebrow px-3.5 py-2.5 text-start font-medium text-text-faint">{t("col_completed_at")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isOpen = expanded === r.id;
            const toneClass = REASON_TONE[r.reason_code] ?? "text-text-muted";
            const toneVar = TONE_VAR[toneClass] ?? "var(--color-text-muted)";
            return (
              <Fragment key={r.id}>
                <tr
                  onClick={() => setExpanded((e) => (e === r.id ? null : r.id))}
                  className={cn(
                    // Solid tokens only: the shared preset's colors are plain
                    // var(--color-*) with no <alpha-value>, so /NN opacity utilities
                    // compile to nothing. Use bg-accent-soft for the live flag.
                    "group cursor-pointer border-b border-hairline transition-colors hover:bg-surface-2",
                    isOpen && "bg-surface-2",
                    highlightId === r.id && "bg-accent-soft",
                  )}
                >
                  <td className="ps-3.5 pe-1 py-2.5 align-middle">
                    <span
                      className={cn(
                        "grid h-5 w-5 place-items-center text-text-faint transition-transform duration-200 group-hover:text-text-muted",
                        isOpen && "rotate-90 text-accent",
                      )}
                      aria-hidden
                    >
                      <MedicalGlyph name="handover" className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-text-faint">{formatDateTime(r.triggered_at, lang)}</td>
                  <td className="px-3.5 py-2.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                        toneClass,
                      )}
                      style={{
                        background: `color-mix(in srgb, ${toneVar} 12%, var(--color-surface))`,
                        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${toneVar} 28%, transparent)`,
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />
                      {REASON_KEY[r.reason_code] ? t(REASON_KEY[r.reason_code]) : r.reason_code}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-text-primary" title={r.summary_ar}>{truncate(r.summary_ar)}</td>
                  <td className="px-3.5 py-2.5 tabular-nums text-text-muted" dir="ltr">{r.target_agent_id || "—"}</td>
                  <td className="px-3.5 py-2.5">
                    {r.completed_at ? (
                      <span className="text-text-faint">{formatDateTime(r.completed_at, lang)}</span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-warning"
                        style={{
                          background: "color-mix(in srgb, var(--color-warning) 12%, var(--color-surface))",
                          boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--color-warning) 28%, transparent)",
                        }}
                      >
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-60" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-warning" />
                        </span>
                        {t("handover_status_open")}
                      </span>
                    )}
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-b border-hairline bg-surface-2">
                    <td colSpan={6} className="px-3.5 pb-4 pt-1">
                      <div className="rounded-lg border border-hairline bg-surface-3 p-4">
                        {r.summary_ar && <p className="mb-3 t-body text-text-primary">{r.summary_ar}</p>}
                        <div className="t-eyebrow mb-1.5 text-text-muted">{t("handover_customer_data")}</div>
                        <pre dir="ltr" className="overflow-x-auto rounded-md border border-hairline bg-surface p-3 text-xs text-text-muted">
                          {JSON.stringify(r.customer_data ?? {}, null, 2)}
                        </pre>
                        <Link
                          href={`/calls/${r.conversation_id}`}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-accent transition-colors hover:text-accent-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <MedicalGlyph name="phone" className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                          {t("view_source_call")}
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
