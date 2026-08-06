"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAdminI18n } from "@/lib/adminI18n";

type AuditRow = {
  id: string;
  admin_email: string | null;
  action: string;
  target_user_id: string | null;
  targetName: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

const ACTION_FILTERS = [
  "",
  "view_user_detail",
  "list_user_chats",
  "view_chat_transcript",
  "ban",
  "unban",
  "grant_vip_30",
  "grant_vip_90",
  "grant_founder",
  "report_resolved",
  "report_dismissed",
  "report_reviewing",
] as const;

export default function AdminAuditPage() {
  const { t, locale } = useAdminI18n();
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(
    async (query = q, act = action) => {
      setLoading(true);
      setErr(null);
      try {
        const url = new URL("/api/admin/audit", window.location.origin);
        if (query.trim()) url.searchParams.set("q", query.trim());
        if (act) url.searchParams.set("action", act);
        const res = await fetch(url.toString());
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t.actionFail);
        setRows(data.logs || []);
      } catch (e) {
        setErr(e instanceof Error ? e.message : t.actionFail);
      } finally {
        setLoading(false);
      }
    },
    [q, action, t.actionFail]
  );

  useEffect(() => {
    void load("", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    void load(q, action);
  };

  const labelAction = (a: string) => {
    const map: Record<string, string> = {
      view_user_detail: t.auditViewUser,
      list_user_chats: t.auditListChats,
      view_chat_transcript: t.auditViewChat,
      ban: t.ban,
      unban: t.unban,
      grant_vip_30: t.vip30,
      grant_vip_90: t.vip90,
      clear_vip: t.clearVip,
      grant_founder: t.founder,
      set_verified: t.verify,
      clear_verified: t.unverify,
      report_resolved: t.markResolved,
      report_dismissed: t.markDismissed,
      report_reviewing: t.markReviewing,
    };
    return map[a] || a;
  };

  return (
    <div>
      <h1 className="text-xl font-semibold">{t.auditTitle}</h1>
      <p className="mt-1 text-sm text-zinc-400">{t.auditSub}</p>

      <form onSubmit={onSearch} className="mt-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.auditSearchPlaceholder}
          className="min-w-[12rem] flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/30"
        />
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
        >
          <option value="">{t.auditAllActions}</option>
          {ACTION_FILTERS.filter(Boolean).map((a) => (
            <option key={a} value={a}>
              {labelAction(a)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
        >
          {t.search}
        </button>
      </form>

      {err && (
        <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {err}
        </div>
      )}

      {loading ? (
        <div className="mt-8 text-sm text-zinc-500">{t.loading}</div>
      ) : rows.length === 0 ? (
        <div className="mt-8 text-sm text-zinc-500">{t.auditEmpty}</div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.04] text-xs text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">{t.auditWhen}</th>
                <th className="px-3 py-2 font-medium">{t.auditAdmin}</th>
                <th className="px-3 py-2 font-medium">{t.auditAction}</th>
                <th className="px-3 py-2 font-medium">{t.target}</th>
                <th className="px-3 py-2 font-medium">Meta</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-white/5 hover:bg-white/[0.03]"
                >
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-400">
                    {r.created_at?.slice(0, 19).replace("T", " ")}
                  </td>
                  <td className="px-3 py-2 text-xs">{r.admin_email || "—"}</td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                      {labelAction(r.action)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.target_user_id ? (
                      <Link
                        href={`/admin/users/${r.target_user_id}`}
                        className="text-sky-300 hover:underline"
                      >
                        {r.targetName || r.target_user_id.slice(0, 8)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="max-w-[220px] truncate px-3 py-2 font-mono text-[10px] text-zinc-500">
                    {r.meta && Object.keys(r.meta).length
                      ? JSON.stringify(r.meta)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-3 py-2 text-[11px] text-zinc-500">
            {locale === "zh"
              ? `共 ${rows.length} 条（最近）`
              : `${rows.length} recent entries`}
          </p>
        </div>
      )}
    </div>
  );
}
