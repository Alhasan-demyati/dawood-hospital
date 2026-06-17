// Server-only by construction (imports supabase-server → next/headers).
import { getSupabaseService } from "./supabase-server";
import { maskPhone } from "./format";
import { kpiContainment, kpiCESAvg, kpiPerUCAutomation } from "./kpis";

const DEFAULT_TZ = process.env.DEFAULT_TIMEZONE || "Asia/Amman";

// --- Shared helpers ---
function one<T>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}
function durationSeconds(started: string, ended: string | null): number | null {
  if (!ended) return null;
  return Math.max(0, Math.round((new Date(ended).getTime() - new Date(started).getTime()) / 1000));
}

// UTC instant of "today 00:00" in Asia/Amman (UTC+3, no DST).
export function ammanDayStart(now: Date = new Date()): Date {
  const OFFSET = 3 * 60 * 60 * 1000;
  const local = new Date(now.getTime() + OFFSET);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - OFFSET);
}

// === Group A — Conversations ===
export type ConversationListItem = {
  id: string;
  started_at: string;
  ended_at: string | null;
  caller_phone_masked: string;
  patient_name: string | null;
  duration_seconds: number | null;
  outcome: string | null;
  use_case: string | null;
  ces_score: number | null;
  turn_count: number;
};
export type ConversationDetail = ConversationListItem & {
  patient_id: string | null;
  language: string;
  raw_metadata: Record<string, unknown>;
  // Enrichment for /calls/[id] (joined, not a separate roundtrip):
  goal_achieved: boolean | null;
  ces_declined: boolean;
  outcome_notes: string | null;
  handover: HandoverListItem | null;
};
export type Turn = { id: string; role: "agent" | "user"; content_ar: string; spoken_at: string };
export type ToolCall = {
  id: string;
  tool_name: string;
  called_at: string;
  ok: boolean;
  error_code: string | null;
  request_json: unknown;
  response_json: unknown;
  duration_ms: number | null;
};
function mapConversation(r: any): ConversationListItem {
  const oc = one<any>(r.outcomes);
  const turnAgg = Array.isArray(r.turns) ? (r.turns[0]?.count ?? 0) : 0;
  const p = one<any>(r.patients);
  const patientName = p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : "";
  return {
    id: r.id,
    started_at: r.started_at,
    ended_at: r.ended_at ?? null,
    caller_phone_masked: maskPhone(r.caller_phone ?? ""),
    patient_name: patientName || null,
    duration_seconds: durationSeconds(r.started_at, r.ended_at ?? null),
    outcome: r.outcome ?? null,
    use_case: oc?.use_case ?? null,
    ces_score: oc?.ces ?? null,
    turn_count: typeof turnAgg === "number" ? turnAgg : 0,
  };
}
export async function listConversations(filters: {
  from?: Date;
  to?: Date;
  outcome?: string;
  useCase?: string;
  phoneLast4?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<ConversationListItem[]> {
  const svc = getSupabaseService();
  const limit = filters.limit ?? 25;
  const offset = filters.offset ?? 0;
  const ucJoin = filters.useCase ? "!inner" : "";
  let q = svc
    .from("conversations")
    .select(
      `id, started_at, ended_at, caller_phone, outcome, patients(first_name, last_name), outcomes${ucJoin}(use_case, ces), turns(count)`,
    )
    .order("started_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (filters.from) q = q.gte("started_at", filters.from.toISOString());
  if (filters.to) q = q.lte("started_at", filters.to.toISOString());
  if (filters.outcome) q = q.eq("outcome", filters.outcome);
  if (filters.useCase) q = q.eq("outcomes.use_case", filters.useCase);
  if (filters.phoneLast4) q = q.like("caller_phone", `%${filters.phoneLast4}`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapConversation);
}
export async function getConversation(id: string): Promise<ConversationDetail | null> {
  const svc = getSupabaseService();
  const { data, error } = await svc
    .from("conversations")
    .select(
      `id, started_at, ended_at, caller_phone, outcome, patient_id, language, elevenlabs_conversation_id,
       patients(first_name, last_name),
       outcomes(use_case, ces, goal_achieved, ces_declined, notes),
       turns(count),
       handovers(id, triggered_at, conversation_id, reason_code, summary_ar, target_agent_id, completed_at)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const base = mapConversation(data);
  const oc = one<any>((data as any).outcomes);
  const hv = one<any>((data as any).handovers);
  return {
    ...base,
    patient_id: (data as any).patient_id ?? null,
    language: (data as any).language ?? "ar",
    raw_metadata: { elevenlabs_conversation_id: (data as any).elevenlabs_conversation_id ?? null },
    goal_achieved: oc?.goal_achieved ?? null,
    ces_declined: oc?.ces_declined ?? false,
    outcome_notes: oc?.notes ?? null,
    handover: hv ? mapHandover(hv) : null,
  };
}
export async function getConversationTranscript(id: string): Promise<Turn[]> {
  const svc = getSupabaseService();
  const { data, error } = await svc
    .from("turns")
    .select("id, speaker, text_raw, text_normalized, created_at")
    .eq("conversation_id", id)
    .order("turn_index", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    role: r.speaker as "agent" | "user",
    content_ar: r.text_raw ?? r.text_normalized ?? "",
    spoken_at: r.created_at,
  }));
}
export async function getConversationToolCalls(id: string): Promise<ToolCall[]> {
  const svc = getSupabaseService();
  const { data, error } = await svc
    .from("tool_calls")
    .select("id, tool_name, created_at, ok, error_code, request_json, response_json, latency_ms")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    tool_name: r.tool_name,
    called_at: r.created_at,
    ok: !!r.ok,
    error_code: r.error_code ?? null,
    request_json: r.request_json,
    response_json: r.response_json,
    duration_ms: r.latency_ms ?? null,
  }));
}

// === Group B — Visits ===
export type VisitListItem = {
  id: string;
  booking_reference: string;
  scheduled_start: string;
  specialty_id: string;
  specialty_code: string;
  specialty_name_ar: string;
  specialty_name_en: string;
  visit_type_code: string;
  visit_type_name_ar: string;
  visit_type_name_en: string;
  patient_id: string;
  patient_name: string | null;
  patient_phone_masked: string;
  status: "scheduled" | "checked_in" | "in_room" | "discharged" | "cancelled" | "no_show";
  created_at: string;
};
export type VisitDetail = VisitListItem & {
  chief_complaint: string | null;
  suggested_specialty_id: string | null;
  notes_internal: string | null;
};
function mapVisit(r: any): VisitListItem {
  const sp = one<any>(r.specialties);
  const vt = one<any>(r.visit_types);
  const p = one<any>(r.patients);
  const patientName = p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : "";
  return {
    id: r.id,
    booking_reference: r.booking_reference,
    scheduled_start: r.scheduled_start,
    specialty_id: r.specialty_id,
    specialty_code: sp?.code ?? "",
    specialty_name_ar: sp?.name_ar ?? "",
    specialty_name_en: sp?.name_en ?? "",
    visit_type_code: vt?.code ?? "",
    visit_type_name_ar: vt?.name_ar ?? "",
    visit_type_name_en: vt?.name_en ?? "",
    patient_id: r.patient_id,
    patient_name: patientName || null,
    patient_phone_masked: maskPhone(p?.phone_e164 ?? ""),
    status: r.status,
    created_at: r.created_at,
  };
}
export async function listVisits(filters: {
  status?: string[];
  specialtyId?: string;
  from?: Date;
  to?: Date;
  phoneLast4?: string;
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
} = {}): Promise<VisitListItem[]> {
  const svc = getSupabaseService();
  const limit = filters.limit ?? 25;
  const offset = filters.offset ?? 0;
  const join = filters.phoneLast4 ? "!inner" : "";
  let q = svc
    .from("visits")
    .select(
      `id, booking_reference, scheduled_start, specialty_id, visit_type_id, patient_id, status, created_at,
       specialties(code, name_ar, name_en), visit_types(code, name_ar, name_en), patients${join}(first_name, last_name, phone_e164)`,
    )
    .order("scheduled_start", { ascending: filters.order === "asc" })
    .range(offset, offset + limit - 1);
  if (filters.status?.length) q = q.in("status", filters.status);
  if (filters.specialtyId) q = q.eq("specialty_id", filters.specialtyId);
  if (filters.from) q = q.gte("scheduled_start", filters.from.toISOString());
  if (filters.to) q = q.lte("scheduled_start", filters.to.toISOString());
  if (filters.phoneLast4) q = q.like("patients.phone_e164", `%${filters.phoneLast4}`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapVisit);
}
export async function getVisit(id: string): Promise<VisitDetail | null> {
  const svc = getSupabaseService();
  const { data, error } = await svc
    .from("visits")
    .select(
      `id, booking_reference, scheduled_start, specialty_id, visit_type_id, patient_id, status, created_at, notes,
       specialties(code, name_ar, name_en), visit_types(code, name_ar, name_en), patients(first_name, last_name, phone_e164),
       visit_intake(chief_complaint, suggested_specialty_id)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const intake = one<any>((data as any).visit_intake);
  return {
    ...mapVisit(data),
    chief_complaint: intake?.chief_complaint ?? null,
    suggested_specialty_id: intake?.suggested_specialty_id ?? null,
    notes_internal: (data as any).notes ?? null,
  };
}

// === Group C — Handovers ===
export type HandoverListItem = {
  id: string;
  triggered_at: string;
  conversation_id: string;
  reason_code: string;
  summary_ar: string;
  target_agent_id: string;
  status: "open" | "completed";
  completed_at: string | null;
};
export type HandoverDetail = HandoverListItem & {
  customer_data: Record<string, unknown>;
};
function mapHandover(r: any): HandoverListItem {
  return {
    id: r.id,
    triggered_at: r.triggered_at,
    conversation_id: r.conversation_id,
    reason_code: r.reason_code,
    summary_ar: r.summary_ar ?? "",
    target_agent_id: r.target_agent_id ?? "",
    // No status column in the schema — derived from completed_at.
    status: r.completed_at ? "completed" : "open",
    completed_at: r.completed_at ?? null,
  };
}

// Returns HandoverDetail[] (incl. customer_data) so the /handovers row drawer
// needs no per-row fetch. Superset of the spec's HandoverListItem[] signature.
export async function listHandovers(filters: {
  reasonCode?: string[];
  status?: "open" | "completed";
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
} = {}): Promise<HandoverDetail[]> {
  const svc = getSupabaseService();
  const limit = filters.limit ?? 25;
  const offset = filters.offset ?? 0;
  let q = svc
    .from("handovers")
    .select("id, triggered_at, conversation_id, reason_code, summary_ar, target_agent_id, completed_at, customer_data")
    .order("triggered_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (filters.reasonCode?.length) q = q.in("reason_code", filters.reasonCode);
  if (filters.status === "open") q = q.is("completed_at", null);
  if (filters.status === "completed") q = q.not("completed_at", "is", null);
  if (filters.from) q = q.gte("triggered_at", filters.from.toISOString());
  if (filters.to) q = q.lte("triggered_at", filters.to.toISOString());
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...mapHandover(r),
    customer_data: ((r as any).customer_data ?? {}) as Record<string, unknown>,
  }));
}
export async function getHandover(id: string): Promise<HandoverDetail | null> {
  const svc = getSupabaseService();
  const { data, error } = await svc
    .from("handovers")
    .select(
      "id, triggered_at, conversation_id, reason_code, summary_ar, target_agent_id, completed_at, customer_data",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...mapHandover(data), customer_data: ((data as any).customer_data ?? {}) as Record<string, unknown> };
}

// === Group D — Facility (single Dawood row) + specialties ===
export type FacilityRow = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  city: string;
  timezone: string;
};
export type SpecialtyRow = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  color_hex: string | null;
};
export async function getFacility(): Promise<FacilityRow> {
  const svc = getSupabaseService();
  const { data, error } = await svc
    .from("facilities")
    .select("id, code, name_ar, name_en, city")
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("No active facility row found");
  return {
    id: data.id,
    code: data.code,
    name_ar: data.name_ar,
    name_en: data.name_en,
    city: data.city ?? "Amman",
    // facilities has no timezone column — Dawood is a single Asia/Amman site.
    timezone: DEFAULT_TZ,
  };
}
export type AdminUserRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  active: boolean;
};
export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const svc = getSupabaseService();
  const { data, error } = await svc
    .from("admin_users")
    .select("id, email, full_name, role, active")
    .order("email", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AdminUserRow[];
}
export async function countVisits(filters: {
  status?: string[];
  specialtyId?: string;
  from?: Date;
  to?: Date;
} = {}): Promise<number> {
  const svc = getSupabaseService();
  let q = svc.from("visits").select("id", { count: "exact", head: true });
  if (filters.status?.length) q = q.in("status", filters.status);
  if (filters.specialtyId) q = q.eq("specialty_id", filters.specialtyId);
  if (filters.from) q = q.gte("scheduled_start", filters.from.toISOString());
  if (filters.to) q = q.lte("scheduled_start", filters.to.toISOString());
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}
export async function listSpecialties(): Promise<SpecialtyRow[]> {
  const svc = getSupabaseService();
  const { data, error } = await svc
    .from("specialties")
    .select("id, code, name_ar, name_en, color_hex")
    .eq("active", true)
    .order("name_ar", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SpecialtyRow[];
}

// === Group E — Overview aggregates ===
export type LiveCounters = {
  calls_today: number;
  contained_pct: number;
  handovers_today: number;
  ces_avg_today: number | null;
};
export type UCAutomationRow = {
  use_case: "UC-D1" | "UC-D2" | "UC-D3" | "UC-D4";
  total: number;
  automated: number;
  automation_pct: number;
};
export type ActivityFeedItem = {
  id: string;
  kind: "tool_call" | "handover" | "visit_booked";
  happened_at: string;
  label_ar: string;
  link_to: string | null;
};

async function countSince(table: string, column: string, since: Date): Promise<number> {
  const svc = getSupabaseService();
  const { count, error } = await svc
    .from(table)
    .select("id", { count: "exact", head: true })
    .gte(column, since.toISOString());
  if (error) throw error;
  return count ?? 0;
}
export async function getLiveCounters(): Promise<LiveCounters> {
  const now = new Date();
  const start = ammanDayStart(now);
  const [calls_today, handovers_today, contained_pct, ces_avg_today] = await Promise.all([
    countSince("conversations", "started_at", start),
    countSince("handovers", "triggered_at", start),
    kpiContainment(start, now),
    kpiCESAvg(start, now),
  ]);
  return { calls_today, contained_pct, handovers_today, ces_avg_today };
}
export async function getLatestConversations(limit: number): Promise<ConversationListItem[]> {
  return listConversations({ limit });
}

const UC_ALL: UCAutomationRow["use_case"][] = ["UC-D1", "UC-D2", "UC-D3", "UC-D4"];
export async function getUCAutomationData(): Promise<UCAutomationRow[]> {
  // Window: trailing 30 days.
  const now = new Date();
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const rows = await kpiPerUCAutomation(from, now);
  const byUC = new Map(rows.map((r) => [r.use_case, r]));
  return UC_ALL.map((uc) => {
    const r = byUC.get(uc);
    const total = r?.total ?? 0;
    const automated = r?.automated ?? 0;
    return { use_case: uc, total, automated, automation_pct: r?.pct ?? 0 };
  });
}
export async function getActivityFeed(limit: number): Promise<ActivityFeedItem[]> {
  const svc = getSupabaseService();
  const per = Math.max(5, Math.ceil(limit / 2));
  const [tools, handovers, visits] = await Promise.all([
    svc.from("tool_calls").select("id, tool_name, conversation_id, created_at").order("created_at", { ascending: false }).limit(per),
    svc.from("handovers").select("id, reason_code, conversation_id, triggered_at").order("triggered_at", { ascending: false }).limit(per),
    svc.from("visits").select("id, booking_reference, created_at").order("created_at", { ascending: false }).limit(per),
  ]);
  const items: ActivityFeedItem[] = [];
  for (const r of (tools.data ?? []) as any[]) {
    items.push({
      id: `tool_${r.id}`,
      kind: "tool_call",
      happened_at: r.created_at,
      label_ar: `استدعاء أداة: ${r.tool_name}`,
      link_to: r.conversation_id ? `/calls/${r.conversation_id}` : null,
    });
  }
  for (const r of (handovers.data ?? []) as any[]) {
    items.push({
      id: `handover_${r.id}`,
      kind: "handover",
      happened_at: r.triggered_at,
      label_ar: `تحويل إلى موظف بشري (${r.reason_code})`,
      link_to: r.conversation_id ? `/calls/${r.conversation_id}` : "/handovers",
    });
  }
  for (const r of (visits.data ?? []) as any[]) {
    items.push({
      id: `visit_${r.id}`,
      kind: "visit_booked",
      happened_at: r.created_at,
      label_ar: `تم حجز زيارة ${r.booking_reference}`,
      link_to: "/visits",
    });
  }
  return items
    .sort((a, b) => new Date(b.happened_at).getTime() - new Date(a.happened_at).getTime())
    .slice(0, limit);
}

// === Group F — Sidebar live summary + chart datasets (DB-reflected) ===

// Amman-local YYYY-MM-DD for a UTC instant (UTC+3, no DST).
function ammanDateKey(ms: number): string {
  return new Date(ms + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export type SidebarStats = {
  visits_total: number;
  visits_today: number;
  patients_total: number;
  specialties_active: number;
  handovers_open: number;
  conversations_total: number;
};
export async function getSidebarStats(): Promise<SidebarStats> {
  const svc = getSupabaseService();
  const start = ammanDayStart();
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const head = () => ({ count: "exact" as const, head: true });
  const [vt, vToday, pt, sp, ho, cv] = await Promise.all([
    svc.from("visits").select("id", head()),
    svc.from("visits").select("id", head()).gte("scheduled_start", start.toISOString()).lt("scheduled_start", end.toISOString()),
    svc.from("patients").select("id", head()),
    svc.from("specialties").select("id", head()).eq("active", true),
    svc.from("handovers").select("id", head()).is("completed_at", null),
    svc.from("conversations").select("id", head()),
  ]);
  return {
    visits_total: vt.count ?? 0,
    visits_today: vToday.count ?? 0,
    patients_total: pt.count ?? 0,
    specialties_active: sp.count ?? 0,
    handovers_open: ho.count ?? 0,
    conversations_total: cv.count ?? 0,
  };
}

// Upcoming N days of scheduled visits, bucketed by Amman day.
export type TrendPoint = { date: string; count: number };
export async function getVisitsTrend(days = 7): Promise<TrendPoint[]> {
  const svc = getSupabaseService();
  const start = ammanDayStart();
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  const { data, error } = await svc
    .from("visits")
    .select("scheduled_start")
    .gte("scheduled_start", start.toISOString())
    .lt("scheduled_start", end.toISOString());
  if (error) throw error;
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) buckets.set(ammanDateKey(start.getTime() + i * 86400000), 0);
  for (const r of (data ?? []) as any[]) {
    const k = ammanDateKey(new Date(r.scheduled_start).getTime());
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
  }
  return Array.from(buckets, ([date, count]) => ({ date, count }));
}

// Visits per specialty, carrying each specialty's own color_hex from the DB.
export type SpecialtySlice = { name_ar: string; color_hex: string | null; count: number };
export async function getSpecialtyBreakdown(): Promise<SpecialtySlice[]> {
  const svc = getSupabaseService();
  const { data, error } = await svc.from("visits").select("specialty_id, specialties(name_ar, color_hex)");
  if (error) throw error;
  const m = new Map<string, SpecialtySlice>();
  for (const r of (data ?? []) as any[]) {
    const s = one<any>(r.specialties);
    if (!s) continue;
    const cur = m.get(s.name_ar) ?? { name_ar: s.name_ar, color_hex: s.color_hex ?? null, count: 0 };
    cur.count += 1;
    m.set(s.name_ar, cur);
  }
  return Array.from(m.values()).sort((a, b) => b.count - a.count);
}

// Visit status distribution (for the donut).
export type StatusSlice = { status: string; count: number };
export async function getStatusBreakdown(): Promise<StatusSlice[]> {
  const svc = getSupabaseService();
  const { data, error } = await svc.from("visits").select("status");
  if (error) throw error;
  const m = new Map<string, number>();
  for (const r of (data ?? []) as any[]) m.set(r.status, (m.get(r.status) ?? 0) + 1);
  return Array.from(m, ([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
}
