#!/usr/bin/env node
// Idempotent migration runner for the Dawood Postgres (Supabase).
//
//   node scripts/apply_migration.mjs                       # apply all pending
//   node scripts/apply_migration.mjs --from 0003 --to 0005 # range
//   node scripts/apply_migration.mjs --target postgres://… # override target
//
// Target DB: --target, else DATABASE_URL, else SUPABASE_DB_URL (this build's
// var name). Driver: uses `pg` if installed; otherwise falls back to shelling
// out to `psql` (neither pg nor postgres was pulled in by step 02, and this
// step adds no npm deps). Tracks applied files in public._migrations.
import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { loadEnv, log, panic } from "./_deploy_lib.mjs";

const MIG_DIR = "supabase/migrations";
function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

async function getRunner(url) {
  try {
    const pg = await import("pg");
    const Client = pg.default?.Client || pg.Client;
    const client = new Client({ connectionString: url });
    await client.connect();
    log("driver: pg");
    return {
      ensure: () =>
        client.query(
          "create table if not exists public._migrations(filename text primary key, applied_at timestamptz not null default now())",
        ),
      applied: async () => new Set((await client.query("select filename from public._migrations")).rows.map((r) => r.filename)),
      run: async (filename, sql) => {
        await client.query("begin");
        try {
          await client.query(sql);
          await client.query("insert into public._migrations(filename) values ($1)", [filename]);
          await client.query("commit");
        } catch (e) {
          await client.query("rollback");
          throw e;
        }
      },
      close: () => client.end(),
    };
  } catch {
    if (spawnSync("psql", ["--version"], { encoding: "utf8" }).status !== 0) {
      panic("No `pg` driver and no `psql` on PATH. Run `npm i pg`, install psql, or apply migrations via the Supabase SQL editor.");
    }
    log("driver: psql (fallback — no pg module installed)");
    const psql = (extra, input) =>
      spawnSync("psql", [url, "-v", "ON_ERROR_STOP=1", ...extra], { input, encoding: "utf8" });
    return {
      ensure: () => {
        const r = psql(["-c", "create table if not exists public._migrations(filename text primary key, applied_at timestamptz not null default now())"]);
        if (r.status !== 0) panic(`ensure _migrations failed:\n${r.stderr}`);
      },
      applied: () => {
        const r = psql(["-tA", "-c", "select filename from public._migrations"]);
        if (r.status !== 0) panic(`read _migrations failed:\n${r.stderr}`);
        return new Set(r.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean));
      },
      run: (filename, sql) => {
        const wrapped = `${sql}\ninsert into public._migrations(filename) values ('${filename}');\n`;
        const r = psql(["--single-transaction"], wrapped);
        if (r.status !== 0) throw new Error(r.stderr || "psql failed");
      },
      close: () => {},
    };
  }
}

async function main() {
  const env = await loadEnv();
  const url = arg("--target") || env.DATABASE_URL || env.SUPABASE_DB_URL;
  if (!url) panic("No target DB. Set DATABASE_URL or SUPABASE_DB_URL, or pass --target <url>.");
  const from = arg("--from");
  const to = arg("--to");

  let files = (await readdir(MIG_DIR)).filter((f) => f.endsWith(".sql")).sort();
  if (from) files = files.filter((f) => f.slice(0, 4) >= from);
  if (to) files = files.filter((f) => f.slice(0, 4) <= to);

  const runner = await getRunner(url);
  log(`${files.length} candidate migration file(s).`);
  await runner.ensure();
  const done = await runner.applied();

  let failures = 0;
  for (const f of files) {
    if (done.has(f)) {
      log(`  • SKIP ${f} (already applied)`);
      continue;
    }
    const sql = await readFile(`${MIG_DIR}/${f}`, "utf8");
    try {
      await runner.run(f, sql);
      log(`  ✓ PASS ${f}`);
    } catch (e) {
      log(`  ✗ FAIL ${f}: ${e.message}`);
      failures += 1;
      break;
    }
  }
  await runner.close();
  if (failures) panic(`${failures} migration(s) failed.`);
  log("All migrations applied.");
}

main().catch((e) => panic(e.stack || e.message));
