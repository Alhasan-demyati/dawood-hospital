"use client";

import { useLanguage, type TranslationKey } from "@dawood/shared";
import { FilterBar, FDate, FMultiChips, FSelect, useFilters } from "@/components/filters/FilterControls";

// The 8 DB-allowed reason codes (migration 0003 CHECK).
const REASONS: { value: string; key: TranslationKey }[] = [
  { value: "consent_declined", key: "reason_consent_declined" },
  { value: "out_of_scope", key: "reason_out_of_scope" },
  { value: "customer_request", key: "reason_customer_request" },
  { value: "low_confidence", key: "reason_low_confidence" },
  { value: "repeated_failure", key: "reason_repeated_failure" },
  { value: "patient_not_found", key: "reason_patient_not_found" },
  { value: "safety", key: "reason_safety" },
  { value: "specialty_unclear", key: "reason_specialty_unclear" },
];

export function HandoversFilters() {
  const { sp, setParams, reset } = useFilters();
  const { t } = useLanguage();

  const reasonOptions = REASONS.map((r) => ({ value: r.value, label: t(r.key) }));
  const selectedReasons = (sp.get("reason") ?? "").split(",").filter(Boolean);
  const statusOptions = [
    { value: "", label: t("filter_all") },
    { value: "open", label: t("handover_status_open") },
    { value: "completed", label: t("handover_status_completed") },
  ];

  return (
    <FilterBar onReset={reset}>
      <FMultiChips
        labelKey="handovers_filter_reason"
        selected={selectedReasons}
        options={reasonOptions}
        onChange={(vals) => setParams({ reason: vals.join(",") })}
      />
      <FSelect
        labelKey="handovers_filter_status"
        value={sp.get("status") ?? ""}
        onChange={(v) => setParams({ status: v })}
        options={statusOptions}
      />
      <FDate labelKey="filter_from" value={sp.get("from") ?? ""} onChange={(v) => setParams({ from: v })} />
      <FDate labelKey="filter_to" value={sp.get("to") ?? ""} onChange={(v) => setParams({ to: v })} />
    </FilterBar>
  );
}
