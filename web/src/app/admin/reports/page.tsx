"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAdminI18n } from "@/lib/adminI18n";

type ReportRow = {
  id: string;
  reporter_id: string;
  target_id: string;
  reporterName: string;
  targetName: string;
  reason: string;
  details: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  conversation_id: string | null;
};

export default function AdminReportsPage() {
  const { t } = useAdminI18n();
  const [status, setStatus] = useState("open");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const url = new URL("/api/admin/reports", window.location.origin);
      url.searchParams.set("status", status);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.actionFail);
      setRows(data.reports || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.actionFail);
    } finally {
      setLoading(false);
    }
  }, [status, t.actionFail]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (
    id: string,
    next: "reviewing" | "resolved" | "dismissed"
  ) => {
    let adminNote: string | undefined;
    if (next === "resolved" || next === "dismissed") {
      const note = window.prompt(t.reportNotePrompt, "") ?? null;
      if (note === null) return;
      if (!note.trim()) {
        setErr(t.reportNoteRequired);
        return;
      }
      adminNote = note.trim();
    }
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next, adminNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.actionFail);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.actionFail);
    } finally {
      setBusyId(null);
    }
  };

  const banAndResolve = async (r: ReportRow) => {
    if (!window.confirm(t.banAndResolveConfirm)) return;
    const reason =
      window.prompt(t.banReasonPrompt, r.reason || "Reported by user") ?? null;
    if (reason === null) return;
    setBusyId(r.id);
    setErr(null);
    try {
      const banRes = await fetch(`/api/admin/users/${r.target_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ban",
          reason: reason.trim() || `Report: ${r.reason}`,
        }),
      });
      const banData = await banRes.json();
      if (!banRes.ok) throw new Error(banData.error || t.actionFail);

      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: r.id,
          status: "resolved",
          adminNote: `Banned: ${reason.trim() || r.reason}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.actionFail);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.actionFail);
    } finally {
      setBusyId(null);
    }
  };

  const tabs: [string, string][] = [
    ["open", t.reportOpen],
    ["reviewing", t.reportReviewing],
    ["resolved", t.reportResolved],
    ["dismissed", t.reportDismissed],
    ["all", t.reportAll],
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold">{t.reportsTitle}</h1>
      <p className="mt-1 text-sm text-zinc-400">{t.reportsSub}</p>

      <div className="mt-4 flex flex-wrap gap-1">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setStatus(id)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              status === id
                ? "bg-white/10 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {err && (
        <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {err}
        </div>
      )}

      {loading ? (
        <div className="mt-8 text-sm text-zinc-500">{t.loading}</div>
      ) : rows.length === 0 ? (
        <div className="mt-8 text-sm text-zinc-500">{t.noReports}</div>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">
                    {t.target}: {r.targetName}{" "}
                    <span className="text-xs font-normal text-zinc-500">
                      ← {t.reporter}: {r.reporterName}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    {t.reason}: {r.reason} · {t.status}: {r.status} ·{" "}
                    {r.created_at?.slice(0, 16).replace("T", " ")}
                  </div>
                  {r.details && (
                    <p className="mt-2 text-sm text-zinc-200">{r.details}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Link
                    href={`/admin/users/${r.target_id}`}
                    className="text-xs text-sky-300 hover:underline"
                  >
                    {t.viewTarget} →
                  </Link>
                  {r.conversation_id && (
                    <Link
                      href={`/admin/users/${r.target_id}?chat=${r.conversation_id}`}
                      className="text-xs text-sky-300/80 hover:underline"
                    >
                      {t.viewChat} →
                    </Link>
                  )}
                </div>
              </div>
              {r.admin_note && (
                <p className="mt-2 text-xs text-zinc-500">
                  {t.adminNote}: {r.admin_note}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => void patch(r.id, "reviewing")}
                  className="rounded-lg border border-white/15 px-2.5 py-1 text-xs hover:bg-white/5 disabled:opacity-40"
                >
                  {t.markReviewing}
                </button>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => void patch(r.id, "resolved")}
                  className="rounded-lg border border-white/15 px-2.5 py-1 text-xs hover:bg-white/5 disabled:opacity-40"
                >
                  {t.markResolved}
                </button>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => void patch(r.id, "dismissed")}
                  className="rounded-lg border border-white/15 px-2.5 py-1 text-xs hover:bg-white/5 disabled:opacity-40"
                >
                  {t.markDismissed}
                </button>
                {r.status !== "resolved" && r.status !== "dismissed" && (
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void banAndResolve(r)}
                    className="rounded-lg border border-rose-500/40 px-2.5 py-1 text-xs text-rose-200 hover:bg-rose-500/10 disabled:opacity-40"
                  >
                    {t.banAndResolve}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
