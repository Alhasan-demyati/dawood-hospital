// Server-only by construction (imports supabase-server → next/headers).
import { getSupabaseService } from "./supabase-server";

// Count-based KPI aggregates computed directly on raw tables. The full
// hospitals/ pack used materialised views (migration 0007); Dawood dropped
// those in step 03, so these recompute on demand. POC data volumes are small.

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

async function countConversations(from: Date, to: Date, extra?: (q: any) => any): Promise<number> {
  const svc = getSupabaseService();
  let q = svc
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .gte("started_at", from.toISOString())
    .lte("started_at", to.toISOString());
  if (extra) q = extra(q);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

/** Containment = completed_automated / all conversations with a final outcome. */
export async function kpiContainment(from: Date, to: Date): Promise<number> {
  const total = await countConversations(from, to, (q) => q.not("outcome", "is", null));
  const automated = await countConversations(from, to, (q) => q.eq("outcome", "completed_automated"));
  return pct(automated, total);
}

/** Average CES (1..10) over outcomes in the window, optionally per use case. */
export async function kpiCESAvg(from: Date, to: Date, useCase?: string): Promise<number | null> {
  const svc = getSupabaseService();
  let q = svc
    .from("outcomes")
    .select("ces, use_case, created_at")
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .not("ces", "is", null);
  if (useCase) q = q.eq("use_case", useCase);
  const { data, error } = await q;
  if (error) throw error;
  const values = (data ?? []).map((r: any) => r.ces).filter((n: any) => typeof n === "number");
  if (!values.length) return null;
  const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
  return Math.round(avg * 10) / 10;
}

/** Share of conversations that captured a (non-declined) CES. */
export async function kpiCESCapture(from: Date, to: Date): Promise<number> {
  const svc = getSupabaseService();
  const total = await countConversations(from, to);
  const { count, error } = await svc
    .from("outcomes")
    .select("id", { count: "exact", head: true })
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .not("ces", "is", null)
    .eq("ces_declined", false);
  if (error) throw error;
  return pct(count ?? 0, total);
}

/** Handover rate = handovers / conversations in the window. */
export async function kpiHandoverRate(from: Date, to: Date): Promise<number> {
  const svc = getSupabaseService();
  const total = await countConversations(from, to);
  const { count, error } = await svc
    .from("handovers")
    .select("id", { count: "exact", head: true })
    .gte("triggered_at", from.toISOString())
    .lte("triggered_at", to.toISOString());
  if (error) throw error;
  return pct(count ?? 0, total);
}

/** No-show rate over the trailing `days` of past visits. */
export async function kpiNoShowRate(days: number): Promise<number> {
  const svc = getSupabaseService();
  const now = new Date();
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const base = () =>
    svc
      .from("visits")
      .select("id", { count: "exact", head: true })
      .gte("scheduled_start", from.toISOString())
      .lte("scheduled_start", now.toISOString());
  const { count: total, error: e1 } = await base();
  if (e1) throw e1;
  const { count: noShow, error: e2 } = await base().eq("status", "no_show");
  if (e2) throw e2;
  return pct(noShow ?? 0, total ?? 0);
}

/** Per-use-case automation: total, automated (goal achieved), and %. */
export async function kpiPerUCAutomation(
  from: Date,
  to: Date,
): Promise<{ use_case: string; total: number; automated: number; pct: number }[]> {
  const svc = getSupabaseService();
  const { data, error } = await svc
    .from("outcomes")
    .select("use_case, goal_achieved, created_at")
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .not("use_case", "is", null);
  if (error) throw error;
  const agg = new Map<string, { total: number; automated: number }>();
  for (const r of (data ?? []) as any[]) {
    const uc = r.use_case as string;
    const cur = agg.get(uc) ?? { total: 0, automated: 0 };
    cur.total += 1;
    if (r.goal_achieved) cur.automated += 1;
    agg.set(uc, cur);
  }
  return [...agg.entries()].map(([use_case, v]) => ({
    use_case,
    total: v.total,
    automated: v.automated,
    pct: pct(v.automated, v.total),
  }));
}
