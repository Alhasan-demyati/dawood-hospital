#!/usr/bin/env node
// ElevenLabs Conversational AI API helpers. Auth header `xi-api-key` on every
// call; base URL https://api.elevenlabs.io.
//
// NOTE: the ConvAI endpoints + payload shapes below follow the ElevenLabs API
// as documented at authoring time. The ConvAI surface changes often — VERIFY
// against the current API reference before running deploy_elevenlabs.mjs --apply.
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { httpJson } from "./_deploy_lib.mjs";

const BASE = "https://api.elevenlabs.io";
let ENV = process.env;

/** Must be called once with the loaded env before using the helpers below. */
export function initEl(env) {
  ENV = env;
  if (!ENV.ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY is not set");
}

function headers(extra = {}) {
  return { "xi-api-key": ENV.ELEVENLABS_API_KEY, ...extra };
}

export async function elGet(path) {
  return httpJson(`${BASE}${path}`, { headers: headers() });
}

export async function elPost(path, body) {
  return httpJson(`${BASE}${path}`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
}

export async function elPatch(path, body) {
  return httpJson(`${BASE}${path}`, {
    method: "PATCH",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
}

/** Multipart upload of one KB markdown file. Returns the created document. */
export async function uploadKBDocument(filePath) {
  const buf = await readFile(filePath);
  const form = new FormData();
  form.append("file", new Blob([buf], { type: "text/markdown" }), basename(filePath));
  return httpJson(`${BASE}/v1/convai/knowledge-base/file`, {
    method: "POST",
    headers: headers(),
    body: form,
  });
}

/** Replace the agent's system prompt. */
export async function setAgentSystemPrompt(agentId, text) {
  return elPatch(`/v1/convai/agents/${agentId}`, {
    conversation_config: { agent: { prompt: { prompt: text } } },
  });
}

/**
 * Diff local tool schemas against the agent's current tools and return a plan
 * { add, update, remove }. The caller applies it (so dry-run can print first).
 */
export async function syncTools(agentId, schemas) {
  const agent = await elGet(`/v1/convai/agents/${agentId}`);
  const current = agent?.conversation_config?.agent?.prompt?.tools || [];
  const byName = new Map(current.map((t) => [t.name, t]));
  const localNames = new Set();
  const plan = { add: [], update: [], remove: [] };
  for (const s of schemas) {
    localNames.add(s.name);
    const existing = byName.get(s.name);
    if (!existing) plan.add.push(s);
    else if (JSON.stringify(existing) !== JSON.stringify(s)) plan.update.push(s);
  }
  for (const t of current) if (!localNames.has(t.name)) plan.remove.push(t);
  return plan;
}

/** Push a fully-resolved tools array onto the agent. */
export async function setAgentTools(agentId, tools) {
  return elPatch(`/v1/convai/agents/${agentId}`, {
    conversation_config: { agent: { prompt: { tools } } },
  });
}

export async function getAgent(agentId) {
  return elGet(`/v1/convai/agents/${agentId}`);
}

export async function listKBDocuments() {
  // Returns the account KB list; shape: { documents: [...] } (verify per API ver).
  return elGet(`/v1/convai/knowledge-base`);
}
