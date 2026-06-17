// Localized display names for DB-driven reference data (specialties + visit
// types). The database stores name_ar + name_en only; German names are curated
// here, keyed by the stable `code`, with an English fallback. The finite sets
// mirror supabase/seed.sql (7 clinics + 8 visit types).
import type { Lang } from "@dawood/shared";

const SPECIALTY_DE: Record<string, string> = {
  cardiology: "Kardiologie",
  ent: "HNO",
  internal_medicine: "Innere Medizin",
  ophthalmology: "Augenheilkunde",
  pediatrics: "Pädiatrie",
  dentistry: "Zahnmedizin",
  dermatology: "Dermatologie",
};

const VISIT_TYPE_DE: Record<string, string> = {
  new_consult_general: "Neue allgemeine Konsultation",
  follow_up_general: "Allgemeine Nachuntersuchung",
  new_consult_pediatric: "Neue pädiatrische Konsultation",
  new_consult_cardiology: "Neue kardiologische Konsultation",
  dental_checkup: "Zahnkontrolle",
  eye_exam: "Augenuntersuchung",
  dermatology_consult: "Dermatologische Konsultation",
  ent_consult: "HNO-Konsultation",
};

export type LocalizedName = { code: string; ar: string; en: string };

function pick(lang: Lang, n: LocalizedName, deMap: Record<string, string>): string {
  if (lang === "ar") return n.ar || n.en || n.code;
  if (lang === "de") return deMap[n.code] || n.en || n.ar || n.code;
  return n.en || n.ar || n.code;
}

export const pickSpecialty = (lang: Lang, n: LocalizedName): string => pick(lang, n, SPECIALTY_DE);
export const pickVisitType = (lang: Lang, n: LocalizedName): string => pick(lang, n, VISIT_TYPE_DE);
