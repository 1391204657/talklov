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
      const one = async (
        name: string,
        fn: () => Promise<{ ok: boolean; detail: string }>
      ) => {
        const t0 = performance.now();
        try {
          const { ok, detail } = await fn();
          next.push({
            name,
            ok,
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

      let samplePhoto = "";

      await one("talklov /api/discover/profiles", async () => {
        const r = await fetch("/api/discover/profiles", { cache: "no-store" });
        const j = await r.json();
        const profiles = (j.profiles || []) as { photo?: string; name?: string }[];
        samplePhoto = profiles.find((p) => p.photo)?.photo || "";
        return {
          ok: r.ok && profiles.length > 0,
          detail: `${r.status} profiles=${profiles.length}${
            profiles[0]?.name ? ` first=${profiles[0].name}` : ""
          }`,
        };
      });

      await one("talklov /api/diag (server→supabase)", async () => {
        const r = await fetch("/api/diag", { cache: "no-store" });
        const j = await r.json();
        const a = j.supabaseAuth || {};
        return {
          ok: r.ok && a.reachable === true,
          detail: `server ${r.status}; supabase reachable=${a.reachable} status=${a.status} ${a.ms}ms`,
        };
      });

      if (SUPABASE_URL) {
        await one("browser → *.supabase.co auth/health", async () => {
          const r = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
            mode: "cors",
          });
          // 401/400 still means the host is reachable from this phone
          const reachable = r.status > 0 && r.status < 500;
          return {
            ok: reachable,
            detail: `status=${r.status} (401/400 = reachable)`,
          };
        });
      }

      await one("talklov media proxy (real photo)", async () => {
        if (!samplePhoto) {
          return { ok: false, detail: "no sample photo from discover" };
        }
        const r = await fetch(samplePhoto, { method: "GET", cache: "no-store" });
        const ct = r.headers.get("content-type") || "";
        const ok = r.ok && ct.startsWith("image/");
        return {
          ok,
          detail: `status=${r.status} type=${ct || "?"} url=${samplePhoto.slice(0, 72)}…`,
        };
      });
    };
    void run();
  }, []);

  return (
    <main className="mx-auto max-w-lg px-4 py-8 text-sm">
      <h1 className="text-xl font-semibold">TalkLov 连通诊断</h1>
      <p className="mt-2 text-muted">
        中美同一页面。请截图发给我们。绿勾 = 该项正常。
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
        {rows.length === 0 && <li className="text-muted">测试中…</li>}
      </ul>
      <p className="mt-6 space-x-4">
        <a href="/discover" className="text-accent underline">
          返回发现
        </a>
        <a href="/profile/lin" className="text-accent underline">
          试开一个资料页
        </a>
      </p>
    </main>
  );
}
