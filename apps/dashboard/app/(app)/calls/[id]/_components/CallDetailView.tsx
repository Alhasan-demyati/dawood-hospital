"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { cn, useLanguage, type TranslationKey } from "@dawood/shared";
import type { ConversationDetail, ToolCall, Turn } from "@/lib/queries";
import { formatDateTime, formatDurationMMSS, toArabicIndicDigits } from "@/lib/format";
import { PageHeader } from "@/components/editorial/PageHeader";
import { RefreshButton } from "@/components/editorial/RefreshButton";
import { SectionTitle } from "@/components/editorial/SectionTitle";
import { TranscriptPanel } from "./TranscriptPanel";

const OUTCOME_KEY: Record<string, TranslationKey> = {
  completed_automated: "outcome_completed_automated",
  completed_with_handover: "outcome_completed_with_handover",
  abandoned: "outcome_abandoned",
  error: "outcome_error",
};
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

// A labelled definition-list row: a .t-eyebrow label over a value (often a chip).
function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="t-eyebrow text-text-faint">{label}</span>
      <span className="t-body-sm text-text-primary">{value}</span>
    </div>
  );
}

function ToolCard({ tc }: { tc: ToolCall }) {
  return (
    <details className="group rounded-xl border border-hairline bg-surface p-3 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="t-body-sm font-semibold text-text-primary">{tc.tool_name}</span>
        <span
          className={cn("t-caption rounded-full border border-hairline px-2 py-0.5", tc.ok ? "text-success" : "text-danger")}
          style={{
            background: `color-mix(in srgb, ${tc.ok ? "var(--color-success)" : "var(--color-danger)"} 12%, var(--color-surface))`,
          }}
        >
          {tc.ok ? "ok" : tc.error_code ?? "error"}
        </span>
      </summary>
      <div className="mt-3 space-y-2" dir="ltr">
        <pre className="t-caption overflow-x-auto rounded-lg bg-surface-3 p-3 text-text-muted">
          {JSON.stringify(tc.request_json ?? null, null, 2)}
        </pre>
        <pre className="t-caption overflow-x-auto rounded-lg bg-surface-3 p-3 text-text-muted">
          {JSON.stringify(tc.response_json ?? null, null, 2)}
        </pre>
      </div>
    </details>
  );
}

export function CallDetailView({
  convo,
  turns,
  tools,
}: {
  convo: ConversationDetail;
  turns: Turn[];
  tools: ToolCall[];
}) {
  const { lang, t } = useLanguage();
  const ar = lang === "ar";
  const live = convo.ended_at == null;
  const last4 = (convo.caller_phone_masked.match(/\d/g) ?? []).slice(-4).join("");

  return (
    <div>
      <PageHeader
        kickerKey="kicker_call_detail"
        titleKey="call_detail_title"
        subtitle={`#${convo.id.slice(0, 8)}`}
        actions={<RefreshButton />}
      />

      {/* Meta strip — case-file header line */}
      <div className="mb-6 flex flex-wrap items-center gap-x-8 gap-y-4 rounded-xl border border-hairline bg-surface p-4 shadow-card">
        <Meta label={t("calls_col_started_at")} value={formatDateTime(convo.started_at, lang)} />
        <Meta label={t("calls_col_duration")} value={formatDurationMMSS(convo.duration_seconds, ar)} />
        <Meta
          label={t("col_phone")}
          value={
            last4 ? (
              <Link
                href={`/visits?phone=${last4}`}
                className="rounded text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                dir="ltr"
              >
                {convo.caller_phone_masked}
              </Link>
            ) : (
              "—"
            )
          }
        />
        <Meta label={t("col_patient_name")} value={convo.patient_name || "—"} />
        <Meta label={t("call_detail_language")} value={<span dir="ltr">{convo.language}</span>} />
        <div className="ms-auto">
          {live ? (
            <span className="t-caption inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 font-semibold text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              {t("live_now")}
            </span>
          ) : convo.outcome ? (
            <span className="t-caption rounded-full border border-hairline bg-surface-2 px-2.5 py-1 text-text-muted">
              {OUTCOME_KEY[convo.outcome] ? t(OUTCOME_KEY[convo.outcome]) : convo.outcome}
            </span>
          ) : null}
        </div>
      </div>

      {/* Case file: transcript hero (inline-start) + metadata rail (inline-end) */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        {/* Transcript hero */}
        <section>
          <SectionTitle titleKey="call_detail_transcript" />
          <TranscriptPanel conversationId={convo.id} initial={turns} live={live} />
        </section>

        {/* Metadata rail */}
        <aside className="space-y-6">
          <section className="rounded-xl border border-hairline bg-surface p-4 shadow-card">
            <SectionTitle titleKey="call_detail_meta" />
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              {convo.outcome && (
                <Meta
                  label={t("call_detail_outcome")}
                  value={
                    <span className="t-caption rounded-full border border-hairline bg-surface-2 px-2 py-0.5 text-text-muted">
                      {OUTCOME_KEY[convo.outcome] ? t(OUTCOME_KEY[convo.outcome]) : convo.outcome}
                    </span>
                  }
                />
              )}
              <Meta label={t("col_use_case")} value={convo.use_case ?? "—"} />
              <Meta
                label={t("call_detail_goal_achieved")}
                value={
                  convo.goal_achieved == null ? (
                    "—"
                  ) : (
                    <span
                      className={cn(
                        "t-caption rounded-full border border-hairline px-2 py-0.5",
                        convo.goal_achieved ? "text-success" : "bg-surface-2 text-text-muted",
                      )}
                      style={
                        convo.goal_achieved
                          ? { background: "color-mix(in srgb, var(--color-success) 12%, var(--color-surface))" }
                          : undefined
                      }
                    >
                      {convo.goal_achieved ? t("yes") : t("no")}
                    </span>
                  )
                }
              />
              <Meta
                label={t("call_detail_ces")}
                value={
                  convo.ces_declined
                    ? t("call_detail_ces_declined")
                    : convo.ces_score != null
                      ? ar
                        ? toArabicIndicDigits(String(convo.ces_score))
                        : convo.ces_score
                      : "—"
                }
              />
              <Meta label={t("call_detail_language")} value={<span dir="ltr">{convo.language}</span>} />
            </dl>

            {convo.handover && (
              <div className="mt-4 rounded-lg border border-hairline bg-surface-3 p-3">
                <div className="t-body-sm flex flex-wrap items-center gap-x-1.5 font-semibold text-warning">
                  <span>{t("call_detail_handover")}</span>
                  <span aria-hidden>—</span>
                  <span>
                    {REASON_KEY[convo.handover.reason_code]
                      ? t(REASON_KEY[convo.handover.reason_code])
                      : convo.handover.reason_code}
                  </span>
                </div>
                {convo.handover.summary_ar && (
                  <p className="t-body-sm mt-1.5 leading-relaxed text-text-muted">{convo.handover.summary_ar}</p>
                )}
              </div>
            )}
          </section>

          {/* Tool calls — expandable JSON */}
          <section>
            <SectionTitle titleKey="call_detail_tools" />
            {tools.length ? (
              <div className="space-y-2">
                {tools.map((tc) => (
                  <ToolCard key={tc.id} tc={tc} />
                ))}
              </div>
            ) : (
              <p className="t-body-sm text-text-muted">{t("call_detail_no_tools")}</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
