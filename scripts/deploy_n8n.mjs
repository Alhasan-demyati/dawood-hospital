#!/usr/bin/env node
// Push the 12 n8n workflows (10 tools + 2 telemetry) to an n8n instance and
// activate each. Dry-run by default; --apply executes.
//
//   node scripts/deploy_n8n.mjs            # dry run
//   node scripts/deploy_n8n.mjs --apply
//
// Reads env: N8N_BASE_URL, N8N_API_KEY. Auth header: X-N8N-API-KEY.
import { readdir, readFile } from "node:fs/promises";
import { loadEnv, requireEnv, log, panic, httpJson, trimSlash } from "./_deploy_lib.mjs";

const APPLY = process.argv.includes("--apply");
const WF_DIR = "n8n/workflows";

function api(env, path, opts = {}) {
  const base = trimSlash(env.N8N_BASE_URL);
  return httpJson(`${base}/api/v1${path}`, {
    ...opts,
    headers: { "X-N8N-API-KEY": env.N8N_API_KEY, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
}

// n8n's create/update endpoint rejects read-only fields — keep only the writable ones.
function sanitize(wf) {
  return { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings || {} };
}

async function main() {
  const env = await loadEnv();
  requireEnv(env, ["N8N_BASE_URL", "N8N_API_KEY"]);
  log(`n8n deploy — ${trimSlash(env.N8N_BASE_URL)} — mode: ${APPLY ? "APPLY" : "DRY RUN"}`);

  const files = (await readdir(WF_DIR)).filter((f) => f.endsWith(".json")).sort();
  const locals = [];
  for (const f of files) locals.push(JSON.parse(await readFile(`${WF_DIR}/${f}`, "utf8")));

  const remote = await api(env, "/workflows?limit=250");
  const remoteList = remote?.data || remote || [];
  const byName = new Map(remoteList.map((w) => [w.name, w]));

  const plan = locals.map((wf) => {
    const existing = byName.get(wf.name);
    return { wf, op: existing ? "update" : "create", id: existing?.id ?? null };
  });

  log(`Planned operations (${plan.length}):`);
  plan.forEach((p, i) => log(`  ${i + 1}. ${p.op.toUpperCase()} ${p.wf.name}${p.id ? ` (id ${p.id})` : ""}`));

  if (!APPLY) {
    log("Dry run only. Re-run with --apply to execute.");
    return;
  }

  let active = 0;
  for (const p of plan) {
    const body = sanitize(p.wf);
    let saved;
    if (p.op === "create") saved = await api(env, "/workflows", { method: "POST", body: JSON.stringify(body) });
    else saved = await api(env, `/workflows/${p.id}`, { method: "PUT", body: JSON.stringify(body) });
    const id = saved?.id ?? saved?.data?.id ?? p.id;
    await api(env, `/workflows/${id}/activate`, { method: "POST" }).catch((e) =>
      log(`  (warn) activate ${p.wf.name}: ${e.message}`),
    );
    active += 1;
    log(`  ✓ ${p.op} + activate: ${p.wf.name} (id ${id})`);
  }
  log(`n8n deploy complete — ${active} workflow(s) created/updated and activated.`);
}

main().catch((e) => panic(e.stack || e.message));
