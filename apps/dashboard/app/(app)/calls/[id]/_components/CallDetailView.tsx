"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { cn, useLanguage, type TranslationKey } from "@dawood/shared";
import type { ConversationDetail, ToolCall, Turn } from "@/lib/queries";
import { formatArabicDateTime, formatDurationMMSS, toArabicIndicDigits } from "@/lib/format";
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

function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <span className="block text-xs text-text-muted">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}

function ToolCard({ tc }: { tc: ToolCall }) {
  return (
    <details className="rounded-md border border-border bg-background p-2">
      <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm">
        <span className="font-medium text-text-primary">{tc.tool_name}</span>
        <span className={cn("rounded-full px-2 py-0.5 text-xs", tc.ok ? "text-success" : "text-danger")}>
          {tc.ok ? "ok" : tc.error_code ?? "error"}
        </span>
      </summary>
      <div className="mt-2 space-y-2" dir="ltr">
        <pre className="overflow-x-auto rounded bg-surface p-2 text-xs text-text-muted">
          {JSON.stringify(tc.request_json ?? null, null, 2)}
        </pre>
        <pre className="overflow-x-auto rounded bg-surface p-2 text-xs text-text-muted">
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
      <PageHeader titleKey="call_detail_title" subtitle={`#${convo.id.slice(0, 8)}`} actions={<RefreshButton />} />

      {/* Meta strip */}
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-border bg-surface p-4 text-sm">
        <Meta label={t("calls_col_started_at")} value={formatArabicDateTime(convo.started_at)} />
        <Meta label={t("calls_col_duration")} value={formatDurationMMSS(convo.duration_seconds, ar)} />
        <Meta
          label={t("col_phone")}
          value={
            last4 ? (
              <Link href={`/visits?phone=${last4}`} className="text-accent hover:underline" dir="ltr">
                {convo.caller_phone_masked}
              </Link>
            ) : (
              "—"
            )
          }
        />
        <Meta label={t("call_detail_language")} value={<span dir="ltr">{convo.language}</span>} />
        {live ? (
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">{t("live_now")}</span>
        ) : convo.outcome ? (
          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-text-muted">
            {OUTCOME_KEY[convo.outcome] ? t(OUTCOME_KEY[convo.outcome]) : convo.outcome}
          </span>
        ) : null}
      </div>

      {/* Transcript + tool timeline */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle titleKey="call_detail_transcript" />
          <TranscriptPanel conversationId={convo.id} initial={turns} live={live} />
        </section>
        <section>
          <SectionTitle titleKey="call_detail_tools" />
          {tools.length ? (
            <div className="space-y-2">
              {tools.map((tc) => (
                <ToolCard key={tc.id} tc={tc} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">{t("call_detail_no_tools")}</p>
          )}
        </section>
      </div>

      {/* Outcome + handover */}
      <section className="mt-6 rounded-lg border border-border bg-surface p-4">
        <SectionTitle titleKey="call_detail_outcome" />
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Meta label={t("col_use_case")} value={convo.use_case ?? "—"} />
          <Meta
            label={t("call_detail_goal_achieved")}
            value={convo.goal_achieved == null ? "—" : convo.goal_achieved ? t("yes") : t("no")}
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
        </div>
        {convo.handover && (
          <div className="mt-4 rounded-md border border-border bg-background p-3">
            <div className="text-sm font-medium text-warning">
              {t("call_detail_handover")} —{" "}
              {REASON_KEY[convo.handover.reason_code]
                ? t(REASON_KEY[convo.handover.reason_code])
                : convo.handover.reason_code}
            </div>
            {convo.handover.summary_ar && (
              <p className="mt-1 text-sm leading-relaxed text-text-muted">{convo.handover.summary_ar}</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
