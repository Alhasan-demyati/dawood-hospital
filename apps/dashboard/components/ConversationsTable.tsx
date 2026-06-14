"use client";

import Link from "next/link";
import { cn, useLanguage, type TranslationKey } from "@dawood/shared";
import type { ConversationListItem } from "@/lib/queries";
import { formatArabicDateTime, formatDurationMMSS, toArabicIndicDigits } from "@/lib/format";

const OUTCOME_KEY: Record<string, TranslationKey> = {
  completed_automated: "outcome_completed_automated",
  completed_with_handover: "outcome_completed_with_handover",
  abandoned: "outcome_abandoned",
  error: "outcome_error",
};
const OUTCOME_TONE: Record<string, string> = {
  completed_automated: "text-success",
  completed_with_handover: "text-warning",
  abandoned: "text-text-muted",
  error: "text-danger",
};
const UC_KEY: Record<string, TranslationKey> = {
  "UC-D1": "uc_d1",
  "UC-D2": "uc_d2",
  "UC-D3": "uc_d3",
  "UC-D4": "uc_d4",
};

function Chip({ label, tone }: { label: string; tone?: string }) {
  return (
    <span className={cn("inline-block rounded-full border border-border px-2 py-0.5 text-xs", tone ?? "text-text-muted")}>
      {label}
    </span>
  );
}

// Shared most-recent-first conversations table. Reused by the overview and the
// /calls page (Phase B). `highlightId` softly flags a row inserted live.
export function ConversationsTable({
  rows,
  highlightId,
}: {
  rows: ConversationListItem[];
  highlightId?: string | null;
}) {
  const { lang, t } = useLanguage();
  const ar = lang === "ar";
  const num = (n: number | null) => (n == null ? "—" : ar ? toArabicIndicDigits(String(n)) : String(n));

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-text-muted">
            <th className="px-3 py-2 text-start font-medium">{t("calls_col_started_at")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("col_phone")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("calls_col_duration")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("col_outcome")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("col_use_case")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("col_ces")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("calls_col_turns")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className={cn(
                // Solid tokens only: the shared preset's colors are plain
                // var(--color-*) with no <alpha-value>, so /NN opacity utilities
                // compile to nothing (and would mis-color the row border).
                "border-b border-border transition-colors hover:bg-accent-soft",
                highlightId === r.id && "bg-accent-soft",
              )}
            >
              <td className="px-3 py-2">
                <Link href={`/calls/${r.id}`} className="font-medium text-text-primary hover:text-accent">
                  {formatArabicDateTime(r.started_at)}
                </Link>
              </td>
              <td className="px-3 py-2 text-text-muted" dir="ltr">{r.caller_phone_masked || "—"}</td>
              <td className="px-3 py-2 tabular-nums text-text-muted">{formatDurationMMSS(r.duration_seconds, ar)}</td>
              <td className="px-3 py-2">
                {r.outcome ? (
                  <Chip label={OUTCOME_KEY[r.outcome] ? t(OUTCOME_KEY[r.outcome]) : r.outcome} tone={OUTCOME_TONE[r.outcome]} />
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-2">
                {r.use_case ? <Chip label={UC_KEY[r.use_case] ? t(UC_KEY[r.use_case]) : r.use_case} /> : "—"}
              </td>
              <td className="px-3 py-2 tabular-nums text-text-muted">{num(r.ces_score)}</td>
              <td className="px-3 py-2 tabular-nums text-text-muted">{num(r.turn_count)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
