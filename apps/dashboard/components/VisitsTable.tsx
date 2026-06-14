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
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
            <th className="px-3 py-2 text-start font-medium">{t("col_booking_ref")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("col_scheduled_start")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("col_specialty")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("col_visit_type")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("col_phone")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("col_status")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("col_created_at")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border transition-colors hover:bg-accent-soft">
              <td className="px-3 py-2 font-medium text-text-primary" dir="ltr">{formatBookingReference(r.booking_reference)}</td>
              <td className="px-3 py-2 text-text-muted">{formatArabicDateTime(r.scheduled_start)}</td>
              <td className="px-3 py-2 text-text-primary">{r.specialty_name_ar}</td>
              <td className="px-3 py-2 text-text-muted">{r.visit_type}</td>
              <td className="px-3 py-2 text-text-muted" dir="ltr">{r.patient_phone_masked || "—"}</td>
              <td className="px-3 py-2">
                <span className={cn("rounded-full border border-border px-2 py-0.5 text-xs", STATUS_TONE[r.status])}>
                  {STATUS_KEY[r.status] ? t(STATUS_KEY[r.status]) : r.status}
                </span>
              </td>
              <td className="px-3 py-2 text-text-muted">{formatArabicDateTime(r.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
