"use client";

import { cn, useLanguage, type TranslationKey } from "@dawood/shared";
import type { VisitListItem } from "@/lib/queries";
import { formatArabicDateTime, formatBookingReference } from "@/lib/format";

const STATUS_KEY: Record<string, TranslationKey> = {
  scheduled: "status_scheduled",
  checked_in: "status_checked_in",
  in_room: "status_in_room",
  discharged: "status_discharged",
  cancelled: "status_cancelled",
  no_show: "status_no_show",
};
const STATUS_TONE: Record<string, string> = {
  scheduled: "text-accent",
  checked_in: "text-success",
  in_room: "text-success",
  discharged: "text-text-muted",
  cancelled: "text-danger",
  no_show: "text-warning",
};

export function VisitsTable({ rows }: { rows: VisitListItem[] }) {
  const { t } = useLanguage();
  return (
    <div className="relative overflow-x-auto rounded-2xl border border-border bg-surface shadow-card">
      {/* inset top highlight — a crafted, lit edge */}
      <span className="pointer-events-none absolute inset-0 z-10 rounded-[inherit]" style={{ boxShadow: "var(--highlight-top)" }} aria-hidden />
      <table className="w-full border-collapse text-sm">
        <thead>
          {/* recessed header well */}
          <tr className="t-eyebrow border-b border-hairline bg-surface-3 text-text-faint">
            <th className="px-3.5 py-2.5 text-start font-medium">{t("col_booking_ref")}</th>
            <th className="px-3.5 py-2.5 text-start font-medium">{t("col_patient_name")}</th>
            <th className="px-3.5 py-2.5 text-start font-medium">{t("col_scheduled_start")}</th>
            <th className="px-3.5 py-2.5 text-start font-medium">{t("col_specialty")}</th>
            <th className="px-3.5 py-2.5 text-start font-medium">{t("col_visit_type")}</th>
            <th className="px-3.5 py-2.5 text-start font-medium">{t("col_phone")}</th>
            <th className="px-3.5 py-2.5 text-start font-medium">{t("col_status")}</th>
            <th className="px-3.5 py-2.5 text-start font-medium">{t("col_created_at")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="border-b border-hairline transition-colors last:border-b-0 hover:bg-surface-2"
            >
              {/* booking ref stays Western digits, dir-safe */}
              <td className="px-3.5 py-2.5 font-medium tabular-nums text-text-primary" dir="ltr">{formatBookingReference(r.booking_reference)}</td>
              <td className="px-3.5 py-2.5 text-text-primary">{r.patient_name || "—"}</td>
              <td className="px-3.5 py-2.5 text-text-faint">{formatArabicDateTime(r.scheduled_start)}</td>
              <td className="px-3.5 py-2.5 text-text-primary">{r.specialty_name_ar}</td>
              <td className="px-3.5 py-2.5 text-text-muted">{r.visit_type}</td>
              {/* phone stays Western digits, dir-safe */}
              <td className="px-3.5 py-2.5 tabular-nums text-text-muted" dir="ltr">{r.patient_phone_masked || "—"}</td>
              <td className="px-3.5 py-2.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-2 px-2.5 py-0.5 text-xs font-medium",
                    STATUS_TONE[r.status],
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />
                  {STATUS_KEY[r.status] ? t(STATUS_KEY[r.status]) : r.status}
                </span>
              </td>
              <td className="px-3.5 py-2.5 text-text-faint">{formatArabicDateTime(r.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
