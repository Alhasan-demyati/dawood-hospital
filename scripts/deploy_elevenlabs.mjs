#!/usr/bin/env node
// Push the Salma agent config to ElevenLabs: system prompt + 17 KB articles +
// 10 tool schemas + agent settings. Dry-run by default; --apply executes.
//
//   node scripts/deploy_elevenlabs.mjs            # dry run, prints the plan
//   node scripts/deploy_elevenlabs.mjs --apply    # actually pushes
//
// Reads env: ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID.
// API shapes follow the ConvAI reference at authoring time — verify before --apply.
import { readdir, readFile } from "node:fs/promises";
import { loadEnv, requireEnv, log, panic, readFileSafe } from "./_deploy_lib.mjs";
import {
  initEl,
  getAgent,
  setAgentSystemPrompt,
  syncTools,
  setAgentTools,
  uploadKBDocument,
  listKBDocuments,
  elPatch,
} from "./_deploy_el_tools.mjs";

const APPLY = process.argv.includes("--apply");

function parseAgentSettings(md) {
  const get = (label) => {
    const re = new RegExp(`\\|\\s*\\*\\*${label}\\*\\*\\s*\\|\\s*\`([^\`]*)\``, "i");
    const m = md.match(re);
    return m ? m[1].trim() : null;
  };
  return {
    voice_id: get("Voice ID"),
    model: get("Model"),
    temperature: get("Temperature"),
    max_tokens: get("Max tokens per response"),
    language: get("Language"),
  };
}

async function main() {
  const env = await loadEnv();
  requireEnv(env, ["ELEVENLABS_API_KEY", "ELEVENLABS_AGENT_ID"]);
  initEl(env);
  const agentId = env.ELEVENLABS_AGENT_ID;

  log(`ElevenLabs deploy — agent ${agentId} — mode: ${APPLY ? "APPLY" : "DRY RUN"}`);
  const agent = await getAgent(agentId);
  const plan = [];

  // 1) System prompt
  const localPrompt = readFileSafe("elevenlabs/system_prompt.md");
  const remotePrompt = agent?.conversation_config?.agent?.prompt?.prompt ?? "";
  if (localPrompt && localPrompt.trim() !== remotePrompt.trim()) {
    plan.push({ kind: "system_prompt", run: () => setAgentSystemPrompt(agentId, localPrompt) });
  }

  // 2) Tools
  const schemasRaw = JSON.parse(readFileSafe("elevenlabs/tool_schemas.json") || "[]");
  const schemas = Array.isArray(schemasRaw) ? schemasRaw : schemasRaw.tools || [];
  const toolPlan = await syncTools(agentId, schemas);
  if (toolPlan.add.length || toolPlan.update.length || toolPlan.remove.length) {
    plan.push({
      kind: `tools (+${toolPlan.add.length} ~${toolPlan.update.length} -${toolPlan.remove.length})`,
      run: () => setAgentTools(agentId, schemas), // local is the source of truth
    });
  }

  // 3) Knowledge base — every kb/*.md except README
  const kbFiles = (await readdir("elevenlabs/kb"))
    .filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md")
    .sort();
  let remoteDocs = [];
  try {
    const kb = await listKBDocuments();
    remoteDocs = (kb?.documents || kb || []).map((d) => d.name || d.filename || "");
  } catch (e) {
    log(`(warn) could not list remote KB documents: ${e.message}`);
  }
  for (const f of kbFiles) {
    if (!remoteDocs.includes(f)) {
      plan.push({ kind: `kb upload ${f}`, run: () => uploadKBDocument(`elevenlabs/kb/${f}`) });
    }
    // Content-diff "replace" needs a remote content hash the list endpoint does
    // not expose; re-upload manually if an article changes. Flagged in the report.
  }

  // 4) Agent settings
  const s = parseAgentSettings(readFileSafe("elevenlabs/agent_settings.md"));
  const settingsBody = { conversation_config: { agent: {}, tts: {} } };
  let settingsDirty = false;
  if (s.voice_id && !s.voice_id.startsWith("<")) {
    settingsBody.conversation_config.tts.voice_id = s.voice_id;
    settingsDirty = true;
  } else {
    log("(warn) Voice ID is still a placeholder in agent_settings.md — skipping voice update.");
  }
  if (s.model) { settingsBody.conversation_config.agent.prompt = { ...(settingsBody.conversation_config.agent.prompt || {}), llm: s.model }; settingsDirty = true; }
  if (s.temperature) { settingsBody.conversation_config.agent.prompt = { ...(settingsBody.conversation_config.agent.prompt || {}), temperature: Number(s.temperature) }; settingsDirty = true; }
  if (s.max_tokens) { settingsBody.conversation_config.agent.prompt = { ...(settingsBody.conversation_config.agent.prompt || {}), max_tokens: Number(s.max_tokens) }; settingsDirty = true; }
  if (s.language) { settingsBody.conversation_config.agent.language = s.language; settingsDirty = true; }
  if (settingsDirty) {
    plan.push({ kind: "agent settings", run: () => elPatch(`/v1/convai/agents/${agentId}`, settingsBody) });
  }

  // 5) Print the plan
  if (!plan.length) {
    log("Nothing to do — agent already in sync.");
    return;
  }
  log(`Planned operations (${plan.length}):`);
  plan.forEach((p, i) => log(`  ${i + 1}. ${p.kind}`));

  // 6) Apply
  if (!APPLY) {
    log("Dry run only. Re-run with --apply to execute.");
    return;
  }
  for (let i = 0; i < plan.length; i++) {
    await plan[i].run();
    log(`  ✓ applied ${i + 1}/${plan.length}: ${plan[i].kind}`);
  }
  log("ElevenLabs deploy complete.");
}

main().catch((e) => panic(e.stack || e.message));
