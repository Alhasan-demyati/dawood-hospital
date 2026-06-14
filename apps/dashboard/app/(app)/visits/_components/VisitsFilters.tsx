"use client";

import { useLanguage, type TranslationKey } from "@dawood/shared";
import type { SpecialtyRow } from "@/lib/queries";
import { FilterBar, FDate, FMultiChips, FSelect, FText, useFilters } from "@/components/filters/FilterControls";

const STATUSES: { value: string; key: TranslationKey }[] = [
  { value: "scheduled", key: "status_scheduled" },
  { value: "checked_in", key: "status_checked_in" },
  { value: "in_room", key: "status_in_room" },
  { value: "discharged", key: "status_discharged" },
  { value: "cancelled", key: "status_cancelled" },
  { value: "no_show", key: "status_no_show" },
];

export function VisitsFilters({ specialties }: { specialties: SpecialtyRow[] }) {
  const { sp, setParams, reset } = useFilters();
  const { t } = useLanguage();

  const specialtyOptions = [
    { value: "", label: t("filter_all") },
    ...specialties.map((s) => ({ value: s.id, label: s.name_ar })),
  ];
  const statusOptions = STATUSES.map((s) => ({ value: s.value, label: t(s.key) }));
  const selectedStatus = (sp.get("status") ?? "").split(",").filter(Boolean);

  return (
    <FilterBar onReset={reset}>
      <FSelect
        labelKey="visits_filter_specialty"
        value={sp.get("specialtyId") ?? ""}
        onChange={(v) => setParams({ specialtyId: v })}
        options={specialtyOptions}
      />
      <FMultiChips
        labelKey="visits_filter_status"
        selected={selectedStatus}
        options={statusOptions}
        onChange={(vals) => setParams({ status: vals.join(",") })}
      />
      <FDate labelKey="filter_from" value={sp.get("from") ?? ""} onChange={(v) => setParams({ from: v })} />
      <FDate labelKey="filter_to" value={sp.get("to") ?? ""} onChange={(v) => setParams({ to: v })} />
      <FText labelKey="calls_filter_phone" value={sp.get("phone") ?? ""} onChange={(v) => setParams({ phone: v })} placeholder="0000" />
    </FilterBar>
  );
}
