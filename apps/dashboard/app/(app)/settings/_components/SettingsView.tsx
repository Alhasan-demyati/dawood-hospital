"use client";

import type { ReactNode } from "react";
import { useLanguage, MedicalGlyph, type GlyphName, type TranslationKey } from "@dawood/shared";
import type { AdminUserRow, FacilityRow, SpecialtyRow } from "@/lib/queries";

// A crafted settings card: recessed lit edge, an eyebrow group label paired with
// a small stroke glyph, and a body slot. Read-only — no toggles, no actions.
function SettingsCard({
  labelKey,
  glyph,
  children,
}: {
  labelKey: TranslationKey;
  glyph: GlyphName;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <section className="relative rounded-2xl border border-hairline bg-surface p-5 shadow-card sm:p-6">
      <span className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ boxShadow: "var(--highlight-top)" }} aria-hidden />
      <div className="mb-4 flex items-center gap-2.5">
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-accent"
          style={{
            background: "color-mix(in srgb, var(--color-accent) 10%, var(--color-surface))",
            boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 22%, transparent)",
          }}
          aria-hidden
        >
          <MedicalGlyph name={glyph} className="h-4 w-4" strokeWidth={1.7} />
        </span>
        <h2 className="t-eyebrow text-text-muted">{t(labelKey)}</h2>
      </div>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="t-eyebrow text-text-faint">{label}</dt>
      <dd className="t-body-sm text-text-primary">{value}</dd>
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
      <SettingsCard labelKey="settings_admins" glyph="users">
        <div className="relative overflow-x-auto rounded-xl border border-hairline bg-surface">
          <table className="w-full border-collapse text-sm">
            <thead>
              {/* recessed header well */}
              <tr className="border-b border-hairline bg-surface-3 text-start">
                <th className="t-eyebrow px-3.5 py-2.5 text-start font-medium text-text-faint">{t("settings_admin_col_email")}</th>
                <th className="t-eyebrow px-3.5 py-2.5 text-start font-medium text-text-faint">{t("settings_admin_col_role")}</th>
                <th className="t-eyebrow px-3.5 py-2.5 text-start font-medium text-text-faint">{t("settings_admin_col_active")}</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className="border-b border-hairline last:border-b-0 transition-colors hover:bg-surface-2">
                  <td className="px-3.5 py-2.5 text-text-primary" dir="ltr">{a.email}</td>
                  <td className="px-3.5 py-2.5">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-text-muted"
                      style={{
                        background: "color-mix(in srgb, var(--color-text-muted) 10%, var(--color-surface))",
                        boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--color-text-muted) 24%, transparent)",
                      }}
                    >
                      {a.role}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <span
                      className={
                        a.active
                          ? "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-success"
                          : "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-text-muted"
                      }
                      style={
                        a.active
                          ? {
                              background: "color-mix(in srgb, var(--color-success) 12%, var(--color-surface))",
                              boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--color-success) 28%, transparent)",
                            }
                          : {
                              background: "color-mix(in srgb, var(--color-text-muted) 10%, var(--color-surface))",
                              boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--color-text-muted) 24%, transparent)",
                            }
                      }
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />
                      {a.active ? t("yes") : t("no")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 t-caption text-text-faint">{t("settings_admins_invite_note")}</p>
      </SettingsCard>

      {/* 2) Facility info */}
      <SettingsCard labelKey="settings_facility" glyph="hospital">
        <div className="t-display-md text-text-primary">{facility.name_ar}</div>
        <div className="t-body-sm text-text-muted" dir="ltr">{facility.name_en}</div>
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
          <InfoRow label={t("settings_facility_city")} value={facility.city} />
          <InfoRow label={t("settings_facility_timezone")} value={<span dir="ltr">{facility.timezone}</span>} />
          <InfoRow label={t("settings_facility_code")} value={<span dir="ltr">{facility.code}</span>} />
        </dl>
        <div className="mt-5 border-t border-hairline pt-4">
          <span className="t-eyebrow text-text-faint">{t("settings_facility_specialties")}</span>
          <p className="mt-1 t-body-sm text-text-primary">{specialties.map((s) => s.name_ar).join("، ")}</p>
        </div>
      </SettingsCard>

      {/* 3) Retention windows */}
      <SettingsCard labelKey="settings_retention" glyph="clock">
        <ul className="space-y-2.5">
          {[
            t("settings_retention_recordings"),
            t("settings_retention_transcripts"),
            t("settings_retention_audit"),
          ].map((line) => (
            <li key={line} className="flex items-start gap-2.5 t-body-sm text-text-primary">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45 rounded-[1px] bg-accent-2" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
        {/* REVIEW WITH LEGAL — retention copy must be vetted with Jordan MoH + Dawood legal. */}
        <p
          className="mt-5 flex items-start gap-2 rounded-lg border border-hairline bg-surface-3 px-3.5 py-2.5 t-caption text-text-muted"
        >
          <MedicalGlyph name="shield" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" strokeWidth={1.7} aria-hidden />
          <span>REVIEW WITH LEGAL — {t("settings_legal_review_note")}</span>
        </p>
      </SettingsCard>
    </div>
  );
}
