"use client";

import { useEffect, useState } from "react";
import { SUPABASE_URL } from "@/lib/supabase/config";

type Row = { name: string; ok: boolean; detail: string; ms: number };

/**
 * Same diagnostic page for US and CN — screenshot this if Discover misbehaves.
 */
export default function DiagPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [ua, setUa] = useState("");

  useEffect(() => {
    setUa(navigator.userAgent);
    const run = async () => {
      const next: Row[] = [];
      const one = async (name: string, fn: () => Promise<string>) => {
        const t0 = performance.now();
        try {
          const detail = await fn();
          next.push({
            name,
            ok: true,
            detail,
            ms: Math.round(performance.now() - t0),
          });
        } catch (e) {
          next.push({
            name,
            ok: false,
            detail: e instanceof Error ? e.message : "failed",
            ms: Math.round(performance.now() - t0),
          });
        }
        setRows([...next]);
      };

      await one("talklov /api/discover/profiles", async () => {
        const r = await fetch("/api/discover/profiles", { cache: "no-store" });
        const j = await r.json();
        return `${r.status} profiles=${(j.profiles || []).length}`;
      });

      await one("talklov /api/diag (server→supabase)", async () => {
        const r = await fetch("/api/diag", { cache: "no-store" });
        const j = await r.json();
        const a = j.supabaseAuth || {};
        return `server ${r.status}; supabase reachable=${a.reachable} status=${a.status} ${a.ms}ms`;
      });

      if (SUPABASE_URL) {
        await one("browser → *.supabase.co auth/health", async () => {
          const r = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
            mode: "cors",
          });
          return `status=${r.status} (401/400 also means reachable)`;
        });
      }

      await one("talklov media proxy", async () => {
        const sample =
          "/api/media/proxy?u=" +
          encodeURIComponent(
            `${SUPABASE_URL}/storage/v1/object/public/avatars/`
          );
        const r = await fetch(sample, { method: "HEAD" });
        return `status=${r.status}`;
      });
    };
    void run();
  }, []);

  return (
    <main className="mx-auto max-w-lg px-4 py-8 text-sm">
      <h1 className="text-xl font-semibold">TalkLov 连通诊断</h1>
      <p className="mt-2 text-muted">
        中美同一页面。请截图发给我们。若「browser → supabase」失败但其它成功，只是直连慢/不稳，列表仍应能用。
      </p>
      <p className="mt-3 break-all rounded-xl border border-line bg-surface p-3 text-xs text-muted">
        UA: {ua || "…"}
      </p>
      <ul className="mt-4 space-y-2">
        {rows.map((r) => (
          <li
            key={r.name}
            className={`rounded-xl border px-3 py-2 ${
              r.ok
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-rose-500/30 bg-rose-500/10"
            }`}
          >
            <div className="font-medium">
              {r.ok ? "✓" : "✗"} {r.name}{" "}
              <span className="text-xs text-muted">{r.ms}ms</span>
            </div>
            <div className="mt-0.5 break-all text-xs text-muted">{r.detail}</div>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="text-muted">测试中…</li>
        )}
      </ul>
      <p className="mt-6">
        <a href="/discover" className="text-accent underline">
          返回发现
        </a>
      </p>
    </main>
  );
}
