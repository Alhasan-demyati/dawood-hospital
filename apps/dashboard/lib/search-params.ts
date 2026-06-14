// Helpers for reading Next.js page searchParams (which may be string | string[]).
export type SearchParams = { [key: string]: string | string[] | undefined };

export function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseDateParam(v: string | string[] | undefined, endOfDay = false): Date | undefined {
  const s = firstParam(v);
  if (!s) return undefined;
  // Anchor the day boundary to Asia/Amman (fixed UTC+3, no DST) so filtered
  // results match the labelled day instead of the server's timezone.
  const d = new Date(`${s}T${endOfDay ? "23:59:59" : "00:00:00"}+03:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function pageParam(v: string | string[] | undefined): number {
  const n = parseInt(firstParam(v) ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Split a comma-joined multi-select param into a string[] (or undefined). */
export function listParam(v: string | string[] | undefined): string[] | undefined {
  const s = firstParam(v);
  if (!s) return undefined;
  const parts = s.split(",").map((x) => x.trim()).filter(Boolean);
  return parts.length ? parts : undefined;
}
