/**
 * One-off: delete Supabase Auth users except an allowlist.
 * Mock/virtual Discover personas are client-only and are not touched.
 *
 * Usage (from web/):
 *   node scripts/purge-test-users.mjs
 *   node scripts/purge-test-users.mjs --yes
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const KEEP = new Set(
  ["7939761@qq.com", "2933363481@qq.com"].map((e) => e.trim().toLowerCase())
);

function isUsableEnvValue(v) {
  if (!v) return false;
  if (/^\[?SENSITIVE\]?$/i.test(v)) return false;
  if (/REDACTED|\*{6,}/i.test(v)) return false;
  return true;
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!isUsableEnvValue(v)) continue;
    if (!(k in process.env) || !isUsableEnvValue(process.env[k])) {
      process.env[k] = v;
    }
  }
}

// Prefer already-injected env (e.g. `vercel env run`). Fill gaps from local first.
loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env.vercel.pull"));

function env(name) {
  const raw = process.env[name];
  if (!raw) return "";
  return raw.trim().replace(/^['"]|['"]$/g, "");
}

const url = env("NEXT_PUBLIC_SUPABASE_URL").replace(
  /\/(rest|auth|storage)\/v1\/?$/i,
  ""
);
const key = env("SUPABASE_SERVICE_ROLE_KEY");
const apply = process.argv.includes("--yes");

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!/^https?:\/\//i.test(url)) {
  console.error("NEXT_PUBLIC_SUPABASE_URL is not a valid http(s) URL");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function listAllUsers() {
  const out = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const batch = data?.users || [];
    out.push(...batch);
    if (batch.length < 200) break;
    page += 1;
  }
  return out;
}

const users = await listAllUsers();
const keep = [];
const purge = [];

for (const u of users) {
  const email = (u.email || "").trim().toLowerCase();
  if (email && KEEP.has(email)) keep.push(u);
  else purge.push(u);
}

console.log(`Total auth users: ${users.length}`);
console.log("KEEP:");
for (const u of keep) {
  console.log(`  ${u.id}  ${u.email}`);
}
console.log(`PURGE (${purge.length}):`);
for (const u of purge) {
  console.log(`  ${u.id}  ${u.email || "(no email)"}  phone=${u.phone || "-"}`);
}

if (!apply) {
  console.log("\nDry run only. Re-run with --yes to delete purge list.");
  process.exit(0);
}

let ok = 0;
let fail = 0;
for (const u of purge) {
  const { error } = await admin.auth.admin.deleteUser(u.id);
  if (error) {
    fail += 1;
    console.error(`FAIL ${u.id} ${u.email}: ${error.message}`);
  } else {
    ok += 1;
    console.log(`deleted ${u.email || u.id}`);
  }
}
console.log(`\nDone. deleted=${ok} failed=${fail} kept=${keep.length}`);
