// Arabic-first formatting helpers for the dashboard.
// Dates always render in the facility timezone (Asia/Amman) with Arabic-Indic
// numerals. Identifiers (phone, booking ref) keep Western digits per the
// master briefing's numeral convention.

const DEFAULT_TZ = process.env.DEFAULT_TIMEZONE || "Asia/Amman";

// Force the Arabic-Indic numbering system: bare "ar"/"ar-JO" can resolve to
// Latin digits on modern ICU, so we pin -u-nu-arab (see the step-07 lesson).
const AR_LOCALE = "ar-JO-u-nu-arab";

const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"] as const;

export function toArabicIndicDigits(s: string): string {
  return String(s).replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);
}

/** Normalise Arabic-Indic digits back to Western (for filtering against E.164). */
export function toWesternDigits(s: string): string {
  return String(s).replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d as (typeof AR_DIGITS)[number])));
}

function asDate(d: Date | string | number): Date {
  return d instanceof Date ? d : new Date(d);
}

export function formatArabicDate(d: Date | string | number, tz: string = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat(AR_LOCALE, {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(asDate(d));
}

export function formatArabicTime(d: Date | string | number, tz: string = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat(AR_LOCALE, {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(asDate(d));
}

export function formatArabicDateTime(d: Date | string | number, tz: string = DEFAULT_TZ): string {
  return `${formatArabicDate(d, tz)} · ${formatArabicTime(d, tz)}`;
}

/** Format a Jordan E.164 number for display (grouped). Western digits. */
export function formatPhoneE164(p: string, locale: "ar" | "en" = "ar"): string {
  void locale; // phone digits stay Western in both languages (identifier)
  const digits = (p || "").replace(/[^\d]/g, "");
  if (!digits) return p || "";
  if (digits.startsWith("962") && digits.length === 12) {
    const nat = digits.slice(3); // 9 digits e.g. 791000001
    return `+962 ${nat.slice(0, 2)} ${nat.slice(2, 5)} ${nat.slice(5)}`;
  }
  return p.startsWith("+") ? p : `+${digits}`;
}

/** Mask a phone for the dashboard: "+962 79* *** 0001". Western digits. */
export function maskPhone(p: string): string {
  const digits = (p || "").replace(/[^\d]/g, "");
  if (digits.length < 7) return p || "";
  const hasJo = digits.startsWith("962");
  const cc = hasJo ? "+962" : `+${digits.slice(0, Math.max(1, digits.length - 9))}`;
  const nat = hasJo ? digits.slice(3) : digits.slice(-9);
  const first2 = nat.slice(0, 2);
  const last4 = nat.slice(-4);
  return `${cc} ${first2}* *** ${last4}`;
}

/** Format a Dawood booking reference (DV-XXXXX). Western digits (identifier). */
export function formatBookingReference(ref: string): string {
  if (!ref) return "";
  const cleaned = ref.toUpperCase().replace(/\s+/g, "");
  const m = cleaned.match(/^DV-?(.+)$/);
  return m ? `DV ${m[1]}` : cleaned;
}

/** Duration in seconds → "mm:ss". Optionally localise digits to Arabic-Indic. */
export function formatDurationMMSS(totalSeconds: number | null, arabic = false): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds)) return "—";
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  const out = `${mm}:${ss}`;
  return arabic ? toArabicIndicDigits(out) : out;
}

/** Format an integer/percent, localising to Arabic-Indic when requested. */
export function formatNumber(n: number | string | null, arabic = false): string {
  if (n == null) return "—";
  const s = String(n);
  return arabic ? toArabicIndicDigits(s) : s;
}
