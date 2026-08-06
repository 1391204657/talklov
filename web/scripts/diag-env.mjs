import { readFileSync } from "node:fs";
const text = readFileSync(".env.vercel.pull", "utf8");
const lines = text.split(/\r?\n/).filter(Boolean).slice(0, 8);
for (const l of lines) {
  const i = l.indexOf("=");
  const k = i < 0 ? l : l.slice(0, i);
  console.log("lineKey", JSON.stringify(k), "hasEquals", i >= 0);
}
const u = text.split(/\r?\n/).find((l) => l.includes("NEXT_PUBLIC_SUPABASE_URL"));
console.log("urlLineFound", Boolean(u));
console.log("urlLineHasHttp", /https?:\/\//.test(u || ""));
console.log("urlLineStartsWith", u ? JSON.stringify(u.slice(0, 28)) : null);
