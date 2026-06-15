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
// Map each tone text-class to the CSS var it draws from, so the pill can mix a
// faint translucent well + hairline from the same color (slash-opacity on these
// preset vars compiles to nothing — color-mix is the only honest path).
const TONE_VAR: Record<string, string> = {
  "text-success": "var(--color-success)",
  "text-warning": "var(--color-warning)",
  "text-danger": "var(--color-danger)",
  "text-text-muted": "var(--color-text-muted)",
};
const UC_KEY: Record<string, TranslationKey> = {
  "UC-D1": "uc_d1",
  "UC-D2": "uc_d2",
  "UC-D3": "uc_d3",
  "UC-D4": "uc_d4",
};

function Chip({ label, tone }: { label: string; tone?: string }) {
  const toneClass = tone ?? "text-text-muted";
  const toneVar = TONE_VAR[toneClass] ?? "var(--color-text-muted)";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClass,
      )}
      style={{
        background: `color-mix(in srgb, ${toneVar} 12%, var(--color-surface))`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${toneVar} 28%, transparent)`,
      }}
    >
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
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-card">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-hairline bg-surface-3 text-start">
            <th className="t-eyebrow px-3 py-2.5 text-start text-text-muted">{t("calls_col_started_at")}</th>
            <th className="t-eyebrow px-3 py-2.5 text-start text-text-muted">{t("col_phone")}</th>
            <th className="t-eyebrow px-3 py-2.5 text-start text-text-muted">{t("col_patient_name")}</th>
            <th className="t-eyebrow px-3 py-2.5 text-start text-text-muted">{t("calls_col_duration")}</th>
            <th className="t-eyebrow px-3 py-2.5 text-start text-text-muted">{t("col_outcome")}</th>
            <th className="t-eyebrow px-3 py-2.5 text-start text-text-muted">{t("col_use_case")}</th>
            <th className="t-eyebrow px-3 py-2.5 text-start text-text-muted">{t("col_ces")}</th>
            <th className="t-eyebrow px-3 py-2.5 text-start text-text-muted">{t("calls_col_turns")}</th>
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
                "border-b border-border transition-colors hover:bg-surface-2",
                highlightId === r.id && "bg-accent-soft",
              )}
            >
              <td className="px-3 py-2.5">
                <Link
                  href={`/calls/${r.id}`}
                  className="font-medium text-text-primary transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="t-caption text-text-faint">{formatArabicDateTime(r.started_at)}</span>
                </Link>
              </td>
              <td className="px-3 py-2.5 text-text-muted" dir="ltr">{r.caller_phone_masked || "—"}</td>
              <td className="px-3 py-2.5 text-text-primary">{r.patient_name || "—"}</td>
              <td className="px-3 py-2.5 tabular-nums text-text-muted">{formatDurationMMSS(r.duration_seconds, ar)}</td>
              <td className="px-3 py-2.5">
                {r.outcome ? (
                  <Chip label={OUTCOME_KEY[r.outcome] ? t(OUTCOME_KEY[r.outcome]) : r.outcome} tone={OUTCOME_TONE[r.outcome]} />
                ) : (
                  <span className="text-text-faint">—</span>
                )}
              </td>
              <td className="px-3 py-2.5">
                {r.use_case ? (
                  <Chip label={UC_KEY[r.use_case] ? t(UC_KEY[r.use_case]) : r.use_case} />
                ) : (
                  <span className="text-text-faint">—</span>
                )}
              </td>
              <td className="px-3 py-2.5"><span className="t-numeral text-sm text-text-primary">{num(r.ces_score)}</span></td>
              <td className="px-3 py-2.5"><span className="t-numeral text-sm text-text-primary">{num(r.turn_count)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
