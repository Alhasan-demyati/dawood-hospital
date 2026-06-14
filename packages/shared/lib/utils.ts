export type ClassValue = string | number | null | false | undefined;

/**
 * Minimal className joiner (no clsx/tailwind-merge dependency). Filters out
 * falsy values and joins the rest with spaces.
 */
export function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(" ");
}

/** Default jurisdiction timezone (Jordan). Mirrors DEFAULT_TIMEZONE env var. */
export const DEFAULT_TIMEZONE = "Asia/Amman";

/**
 * Format an instant as a localized date + time. Defaults to Arabic (Jordan)
 * in the Asia/Amman timezone.
 */
export function formatDateTime(
  value: Date | string | number,
  locale = "ar-JO",
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: "short",
    timeZone,
  }).format(date);
}

/** Format a duration in seconds as `m:ss` (e.g. 95 → "1:35"). */
export function formatDuration(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
