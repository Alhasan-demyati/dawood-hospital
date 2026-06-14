"use client";

import type { ReactNode } from "react";
import { useLanguage } from "@dawood/shared";
import type { AdminUserRow, FacilityRow, SpecialtyRow } from "@/lib/queries";
import { SectionTitle } from "@/components/editorial/SectionTitle";

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="text-text-primary">{value}</dd>
    </div>
  );
}

// Read-only settings: admins / facility / retention. No env toggles, no
// mock-vs-live switch, no destructive actions.
export function SettingsView({
  admins,
  facility,
  specialties,
}: {
  admins: AdminUserRow[];
  facility: FacilityRow;
  specialties: SpecialtyRow[];
}) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      {/* 1) Admin users */}
      <section className="rounded-lg border border-border bg-surface p-5">
        <SectionTitle titleKey="settings_admins" />
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                <th className="px-3 py-2 text-start font-medium">{t("settings_admin_col_email")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("settings_admin_col_role")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("settings_admin_col_active")}</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className="border-b border-border">
                  <td className="px-3 py-2 text-text-primary" dir="ltr">{a.email}</td>
                  <td className="px-3 py-2 text-text-muted">{a.role}</td>
                  <td className="px-3 py-2 text-text-muted">{a.active ? t("yes") : t("no")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-text-muted">{t("settings_admins_invite_note")}</p>
      </section>

      {/* 2) Facility info */}
      <section className="rounded-lg border border-border bg-surface p-5">
        <SectionTitle titleKey="settings_facility" />
        <div className="font-display text-2xl font-semibold text-text-primary">{facility.name_ar}</div>
        <div className="text-sm text-text-muted" dir="ltr">{facility.name_en}</div>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <InfoRow label={t("settings_facility_city")} value={facility.city} />
          <InfoRow label={t("settings_facility_timezone")} value={<span dir="ltr">{facility.timezone}</span>} />
          <InfoRow label={t("settings_facility_code")} value={<span dir="ltr">{facility.code}</span>} />
        </dl>
        <div className="mt-4">
          <span className="text-xs text-text-muted">{t("settings_facility_specialties")}</span>
          <p className="text-sm text-text-primary">{specialties.map((s) => s.name_ar).join("، ")}</p>
        </div>
      </section>

      {/* 3) Retention windows */}
      <section className="rounded-lg border border-border bg-surface p-5">
        <SectionTitle titleKey="settings_retention" />
        <ul className="space-y-1 text-sm text-text-primary">
          <li>{t("settings_retention_recordings")}</li>
          <li>{t("settings_retention_transcripts")}</li>
          <li>{t("settings_retention_audit")}</li>
        </ul>
        {/* REVIEW WITH LEGAL — retention copy must be vetted with Jordan MoH + Dawood legal. */}
        <p className="mt-4 text-xs text-text-muted">REVIEW WITH LEGAL — {t("settings_legal_review_note")}</p>
      </section>
    </div>
  );
}
