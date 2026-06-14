#!/usr/bin/env node
// Jordan PDP (Personal Data Protection) right-to-erasure flow. Dry-run by
// default; --apply prompts the operator interactively before deleting.
//
//   node scripts/delete_patient_data.mjs --phone "+962791000001"           # dry
//   node scripts/delete_patient_data.mjs --phone "+962791000001" --apply
//
// Reads env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
// OPERATOR_EMAIL. Uses the already-installed @supabase/supabase-js (no new dep).
//
// Erasure model (matches the real schema): deleting the patient CASCADES
// visits + visit_intake; conversations.patient_id is ON DELETE SET NULL, so
// telemetry rows are RETAINED (retention-protected) and their caller_phone is
// anonymised to NULL. audit_log is append-only — a new erasure row is appended;
// existing audit rows are never modified or deleted.
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, log, panic } from "./_deploy_lib.mjs";

const APPLY = process.argv.includes("--apply");
function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

function normalizePhone(raw) {
  let d = (raw || "").replace(/[^\d+]/g, "");
  if (d.startsWith("00")) d = `+${d.slice(2)}`;
  if (!d.startsWith("+")) {
    if (d.startsWith("0")) d = `+962${d.slice(1)}`;
    else if (d.startsWith("962")) d = `+${d}`;
    else d = `+962${d}`;
  }
  return d;
}

async function countIn(sb, table, col, ids) {
  if (!ids.length) return 0;
  const { count, error } = await sb.from(table).select("id", { count: "exact", head: true }).in(col, ids);
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

async function main() {
  const env = await loadEnv();
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) panic("Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.");
  if (!arg("--phone")) panic('Pass --phone "+962...".');
  const phone = normalizePhone(arg("--phone"));
  const operator = env.OPERATOR_EMAIL || "unknown@operator";

  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  log(`delete_patient_data — phone ${phone} — mode: ${APPLY ? "APPLY" : "DRY RUN"}`);

  const { data: pat, error: pErr } = await sb
    .from("patients")
    .select("id, first_name, last_name")
    .eq("phone_e164", phone)
    .maybeSingle();
  if (pErr) panic(pErr.message);
  if (!pat) {
    log("No patient found for that phone. Nothing to do.");
    process.exit(0);
  }
  log(`Patient: ${pat.id} (${pat.first_name} ${pat.last_name})`);

  const { data: visitRows } = await sb.from("visits").select("id").eq("patient_id", pat.id);
  const visitIds = (visitRows || []).map((v) => v.id);
  const { data: convRows } = await sb.from("conversations").select("id").eq("patient_id", pat.id);
  const convIds = (convRows || []).map((c) => c.id);

  const counts = {
    visits: visitIds.length,
    visit_intake: await countIn(sb, "visit_intake", "visit_id", visitIds),
    conversations: convIds.length,
    turns: await countIn(sb, "turns", "conversation_id", convIds),
    tool_calls: await countIn(sb, "tool_calls", "conversation_id", convIds),
    handovers: await countIn(sb, "handovers", "conversation_id", convIds),
    outcomes: await countIn(sb, "outcomes", "conversation_id", convIds),
    customer_feedback: await countIn(sb, "customer_feedback", "conversation_id", convIds),
    consent_log: await countIn(sb, "consent_log", "conversation_id", convIds),
  };
  log("Rows in scope (visits + visit_intake are DELETED via cascade; conversation telemetry is RETAINED + anonymised):");
  for (const [t, n] of Object.entries(counts)) log(`  ${t.padEnd(20)} ${n}`);
  log("Plan: DELETE patients (cascades visits + visit_intake); conversations.patient_id → NULL + caller_phone anonymised; audit_log row appended.");

  if (!APPLY) {
    log("Dry run only. Re-run with --apply to erase.");
    process.exit(0);
  }

  const rl = createInterface({ input, output });
  const ans = await rl.question("Type DELETE to confirm: ");
  rl.close();
  if (ans.trim() !== "DELETE") panic("Not confirmed — aborting.", 2);

  // Append the audit row first so the request is recorded even if a step fails.
  const { error: auErr } = await sb.from("audit_log").insert({
    actor: "admin",
    action: "patient_data_erasure",
    target_table: "patients",
    target_id: pat.id,
    after_json: { phone, operator, counts },
  });
  if (auErr) log(`(warn) audit_log append: ${auErr.message}`);

  const { error: dErr } = await sb.from("patients").delete().eq("id", pat.id);
  if (dErr) panic(`patient delete failed: ${dErr.message}`);

  if (convIds.length) {
    const { error: aErr } = await sb.from("conversations").update({ caller_phone: null }).in("id", convIds);
    if (aErr) log(`(warn) anonymise caller_phone: ${aErr.message}`);
  }

  log(`Erasure complete for ${phone} (operator: ${operator}). audit_log is append-only and is never deleted.`);
  process.exit(0);
}

main().catch((e) => panic(e.stack || e.message));
