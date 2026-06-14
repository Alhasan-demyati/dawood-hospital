// buildArabicDateInfo — produces the {{current_date_info}} dynamic variable the
// ElevenLabs system prompt (step 05) reads to ground all date arithmetic.
//
// Returns a 21-day weekday reference table (today + the next 20 days) as a
// single multi-line string, formatted in Arabic with Arabic-Indic numerals.
// Production timezone is Asia/Amman (Jordan, UTC+3, no DST).

const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"] as const;

function toArabicDigits(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);
}

// Arabic relative-day label for an offset from today.
function offsetLabel(n: number): string {
  if (n === 0) return "اليوم";
  if (n === 1) return "غدًا";
  if (n === 2) return "بعد غد";
  return `بعد ${toArabicDigits(n)} أيام`;
}

/**
 * Build the multi-line Arabic date reference table.
 *
 * Line 0: "اليوم <weekday> الموافق <day month year>"
 * Lines 1–20: "<relative-label> <weekday> <day month year>"
 *
 * @param now Reference instant (the caller passes `new Date()` in production).
 * @param tz  IANA timezone — defaults to Asia/Amman; overridable for testing.
 */
export function buildArabicDateInfo(now: Date, tz = "Asia/Amman"): string {
  // Force the Arabic-Indic numbering system (-u-nu-arab): plain "ar" resolves
  // to Latin digits on modern ICU (e.g. Node ≥20 / recent browsers), which
  // would violate the Arabic-Indic-numerals requirement.
  const weekdayFmt = new Intl.DateTimeFormat("ar-u-nu-arab", { timeZone: tz, weekday: "long" });
  const dateFmt = new Intl.DateTimeFormat("ar-u-nu-arab", {
    timeZone: tz,
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const DAY_MS = 24 * 60 * 60 * 1000; // Amman has no DST, so +24h == next calendar day.
  const lines: string[] = [];

  for (let n = 0; n <= 20; n++) {
    const d = new Date(now.getTime() + n * DAY_MS);
    const weekday = weekdayFmt.format(d);
    const date = dateFmt.format(d);
    lines.push(
      n === 0
        ? `${offsetLabel(n)} ${weekday} الموافق ${date}`
        : `${offsetLabel(n)} ${weekday} ${date}`,
    );
  }

  return lines.join("\n");
}
