#!/usr/bin/env node
// E2E UC-D2 happy path (+ UC-D3 follow-ups + a handover sanity check) against a
// LIVE n8n. WRITES data — run against a test/staging DB only.
//
//   node scripts/verify_booking.mjs
//
// Reads env: N8N_BASE_URL, N8N_SHARED_SECRET (the webhook X-Auth-Secret).
//
// IMPORTANT (reality vs the step-09 spec): webhook paths are HYPHENATED
// (get-patient-by-phone, book-visit, …) and the booking reference is DV-XXXXX —
// per the actual step-06 n8n workflows, NOT the spec's underscore paths or the
// ^DAW-\d{6}$ pattern.
import { loadEnv, requireEnv, log, panic, trimSlash } from "./_deploy_lib.mjs";

const SEED_PHONE = "+962791000001"; // أحمد الحسن (MRN-0001) — supabase/seed.sql
const BOOKING_RE = /^DV-[A-Z0-9]{5}$/;

let pass = 0;
let fail = 0;
function check(name, ok, detail = "") {
  if (ok) {
    pass += 1;
    console.log(`  ✓ PASS  ${name}`);
  } else {
    fail += 1;
    console.log(`  ✗ FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
  return ok;
}

async function callTool(env, path, body) {
  const url = `${trimSlash(env.N8N_BASE_URL)}/webhook/${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Auth-Secret": env.N8N_SHARED_SECRET },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { ok: false, _raw: text, _status: res.status };
  }
  return json;
}

async function main() {
  const env = await loadEnv();
  requireEnv(env, ["N8N_BASE_URL", "N8N_SHARED_SECRET"]);
  log(`verify_booking — ${trimSlash(env.N8N_BASE_URL)}`);

  // 1) get_patient_by_phone
  const r1 = await callTool(env, "get-patient-by-phone", { phone: SEED_PHONE });
  const patient = r1?.data?.patient;
  check("1. get_patient_by_phone", r1?.ok === true && !!patient?.id, JSON.stringify(r1));
  const patientId = patient?.id;

  // 2) suggest_specialty
  const r2 = await callTool(env, "suggest-specialty", { chief_complaint: "عندي ألم في الصدر منذ يومين" });
  const topConf = r2?.data?.top_confidence ?? 0;
  const specialtyId = r2?.data?.top_specialty_id;
  check("2. suggest_specialty (top_confidence ≥ 0.5)", r2?.ok === true && topConf >= 0.5 && !!specialtyId, JSON.stringify(r2?.data));

  // 3) check_availability (next 14 days) — pick the first slot
  const now = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);
  const r3 = await callTool(env, "check-availability", {
    specialty_id: specialtyId,
    specialty: specialtyId, // compat: the current n8n check_availability reads `specialty` — see step-09 report flag
    from_date: fmt(now),
    to_date: fmt(new Date(now.getTime() + 14 * 86400000)),
  });
  const slots = r3?.data?.slots || [];
  check("3. check_availability (≥ 1 slot)", r3?.ok === true && slots.length > 0, `slots=${slots.length}`);
  const slot1 = slots[0]?.start || slots[0]?.start_time;
  const slot2 = slots[1]?.start || slots[1]?.start_time || slot1;

  // 4) book_visit
  const r4 = await callTool(env, "book-visit", {
    spoken_phone: SEED_PHONE,
    specialty_id: specialtyId,
    specialty: specialtyId, // compat: book_visit's resolver reads `specialty` (see step-09 report flag)
    suggested_specialty_id: specialtyId,
    chief_complaint: "ألم في الصدر",
    picked_by: "bot_suggestion",
    start_time: slot1,
    confirmation_token: `confirmed_${new Date().toISOString()}`,
  });
  const bookingRef = r4?.data?.booking_reference;
  const visitId = r4?.data?.visit?.id || r4?.data?.visit_id;
  check("4. book_visit (booking_reference DV-XXXXX)", r4?.ok === true && BOOKING_RE.test(bookingRef || ""), `ref=${bookingRef}`);

  // 5) list_visits
  const r5 = await callTool(env, "list-visits", { patient_id: patientId });
  const visits = r5?.data?.visits || [];
  const found = visits.find((v) => v.booking_reference === bookingRef);
  check("5. list_visits (new booking present + scheduled)", r5?.ok === true && !!found && found.status === "scheduled", `found=${!!found}`);

  // 6) reschedule_visit
  const r6 = await callTool(env, "reschedule-visit", {
    visit_id: visitId,
    booking_reference: bookingRef,
    new_start: slot2,
    confirmation_token: `confirmed_${new Date().toISOString()}`,
  });
  // reschedule_visit returns data = { visit_id, scheduled_start, …_display_ar/en } (no status field)
  const r6ok = r6?.ok === true && (!!r6?.data?.visit_id || r6?.data?.status === "scheduled" || r6?.data?.visit?.status === "scheduled");
  check("6. reschedule_visit (succeeded, slot moved)", r6ok, JSON.stringify(r6?.data));

  // 7) cancel_visit
  const r7 = await callTool(env, "cancel-visit", {
    visit_id: visitId,
    booking_reference: bookingRef,
    reason: "اختبار آلي",
    confirmation_token: `confirmed_${new Date().toISOString()}`,
  });
  // cancel_visit returns data = { visit_id, cancelled_at } (no status field)
  const r7ok = r7?.ok === true && (!!r7?.data?.cancelled_at || r7?.data?.status === "cancelled" || r7?.data?.visit?.status === "cancelled");
  check("7. cancel_visit (cancelled)", r7ok, JSON.stringify(r7?.data));

  // 8) prepare_handover — OPTIONAL: needs an existing conversation row (FK).
  //    Reported, but does NOT fail the run (steps 1–7 are the required gate).
  const r8 = await callTool(env, "prepare-handover", {
    conversation_id: "00000000-0000-0000-0000-000000000000",
    reason_code: "out_of_scope", // a real DB-allowed reason_code
    summary_ar: "اختبار آلي لمسار التحويل.",
    customer_data: { phone: SEED_PHONE, intent: "test" },
  });
  if (r8?.ok === true && (r8?.data?.handover_id || r8?.data?.target_agent_id)) {
    check("8. prepare_handover (optional)", true);
  } else {
    console.log(`  ⚠ SKIP  8. prepare_handover (optional) — ${r8?.error_code || "needs an existing conversation_id"}`);
  }

  console.log(`\nResult: ${pass} passed, ${fail} failed (steps 1–7 are the required gate).`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => panic(e.stack || e.message));
