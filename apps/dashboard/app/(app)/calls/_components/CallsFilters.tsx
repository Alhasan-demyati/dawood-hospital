"use client";

import { useLanguage } from "@dawood/shared";
import { FilterBar, FDate, FSelect, FText, useFilters } from "@/components/filters/FilterControls";

export function CallsFilters() {
  const { sp, setParams, reset } = useFilters();
  const { t } = useLanguage();

  const outcomeOptions = [
    { value: "", label: t("filter_all") },
    { value: "completed_automated", label: t("outcome_completed_automated") },
    { value: "completed_with_handover", label: t("outcome_completed_with_handover") },
    { value: "abandoned", label: t("outcome_abandoned") },
    { value: "error", label: t("outcome_error") },
  ];
  const ucOptions = [
    { value: "", label: t("filter_all") },
    { value: "UC-D1", label: t("uc_d1") },
    { value: "UC-D2", label: t("uc_d2") },
    { value: "UC-D3", label: t("uc_d3") },
    { value: "UC-D4", label: t("uc_d4") },
  ];

  return (
    <FilterBar onReset={reset}>
      <FDate labelKey="filter_from" value={sp.get("from") ?? ""} onChange={(v) => setParams({ from: v })} />
      <FDate labelKey="filter_to" value={sp.get("to") ?? ""} onChange={(v) => setParams({ to: v })} />
      <FSelect labelKey="calls_filter_outcome" value={sp.get("outcome") ?? ""} onChange={(v) => setParams({ outcome: v })} options={outcomeOptions} />
      <FSelect labelKey="calls_filter_use_case" value={sp.get("uc") ?? ""} onChange={(v) => setParams({ uc: v })} options={ucOptions} />
      <FText labelKey="calls_filter_phone" value={sp.get("phone") ?? ""} onChange={(v) => setParams({ phone: v })} placeholder="0000" />
    </FilterBar>
  );
}
