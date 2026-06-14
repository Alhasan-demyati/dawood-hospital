#!/usr/bin/env node
// Shared helpers for the Dawood Hospital operational scripts (مستشفى داوود).
// Node built-ins only — no npm dependencies (dotenv was NOT added in step 02,
// so env files are parsed by hand here).
import { readFile } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";

// --- env -------------------------------------------------------------------
function parseEnvText(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

/**
 * Load env, merging (process.env wins, then files in order). The spec's default
 * is apps/dashboard/.env.local; this build also merges the ROOT .env.local
 * (which centralises the full ElevenLabs/n8n/Supabase cred set) plus apps/call.
 */
export async function loadEnv(envPath = "apps/dashboard/.env.local") {
  const env = { ...process.env };
  const candidates = [".env.local", "apps/dashboard/.env.local", "apps/call/.env.local", envPath];
  const seen = new Set();
  for (const f of candidates) {
    if (seen.has(f) || !existsSync(f)) continue;
    seen.add(f);
    const parsed = parseEnvText(await readFile(f, "utf8"));
    for (const [k, v] of Object.entries(parsed)) {
      if (env[k] == null || env[k] === "") env[k] = v;
    }
  }
  return env;
}

export function requireEnv(env, keys) {
  const missing = keys.filter((k) => !env[k]);
  if (missing.length) panic(`Missing required env var(s): ${missing.join(", ")}`);
}

// --- logging ---------------------------------------------------------------
export function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

export function panic(msg, code = 1) {
  console.error(`[${new Date().toISOString()}] FATAL: ${msg}`);
  process.exit(code);
}

// --- fs --------------------------------------------------------------------
export function readFileSafe(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

// --- http ------------------------------------------------------------------
/** fetch + JSON. Throws (surfacing the response body) on a non-2xx status. */
export async function httpJson(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const detail = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}\n${detail}`);
  }
  return body;
}

// --- tiny line diff (dry-run output) ---------------------------------------
export function diffStrings(a, b) {
  const al = (a || "").split(/\r?\n/);
  const bl = (b || "").split(/\r?\n/);
  const aset = new Set(al);
  const bset = new Set(bl);
  const out = [];
  for (const line of al) if (!bset.has(line)) out.push({ type: "-", line });
  for (const line of bl) if (!aset.has(line)) out.push({ type: "+", line });
  return out;
}

export function trimSlash(u) {
  return (u || "").replace(/\/+$/, "");
}
