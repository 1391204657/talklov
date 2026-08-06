"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAdminI18n } from "@/lib/adminI18n";

type Row = {
  id: string;
  userId: string;
  userName: string;
  profilePhotos: string[];
  alreadyVerified: boolean;
  selfieData: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  livenessScore: number | null;
  livenessProvider: string | null;
};

export default function AdminVerificationsPage() {
  const { t } = useAdminI18n();
  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const url = new URL("/api/admin/verifications", window.location.origin);
      url.searchParams.set("status", status);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.actionFail);
      setRows(data.requests || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.actionFail);
    } finally {
      setLoading(false);
    }
  }, [status, t.actionFail]);

  useEffect(() => {
    void load();
  }, [load]);

  const review = async (r: Row, action: "approve" | "reject") => {
    let note: string | null = null;
    if (action === "reject") {
      note = window.prompt(t.verifyRejectPrompt, "") ?? null;
      if (note === null) return;
      if (!note.trim()) {
        setErr(t.verifyRejectNeedNote);
        return;
      }
    } else if (!window.confirm(t.verifyApproveConfirm)) {
      return;
    }

    setBusyId(r.id);
    setErr(null);
    try {
      const res = await fetch("/api/admin/verifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: r.id,
          action,
          adminNote: note?.trim() || undefined,
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
    ["pending", t.verifyPending],
    ["approved", t.verifyApproved],
    ["rejected", t.verifyRejected],
    ["all", t.verifyAll],
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold">{t.verifyTitle}</h1>
      <p className="mt-1 text-sm text-zinc-400">{t.verifySub}</p>

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
        <div className="mt-8 text-sm text-zinc-500">{t.verifyEmpty}</div>
      ) : (
        <div className="mt-4 space-y-4">
          {rows.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {r.userName}{" "}
                    <span className="text-xs font-normal text-zinc-500">
                      {r.status} · {r.createdAt?.slice(0, 16).replace("T", " ")}
                      {typeof r.livenessScore === "number"
                        ? ` · 闪验 ${r.livenessScore.toFixed(1)}`
                        : r.livenessProvider === "manual_selfie"
                          ? " · 自拍通道"
                          : ""}
                    </span>
                  </div>
                  <Link
                    href={`/admin/users/${r.userId}`}
                    className="mt-1 inline-block text-xs text-sky-300 hover:underline"
                  >
                    {t.viewTarget} →
                  </Link>
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => void review(r, "approve")}
                      className="rounded-lg border border-emerald-500/40 px-2.5 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-40"
                    >
                      {t.verifyApprove}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => void review(r, "reject")}
                      className="rounded-lg border border-rose-500/40 px-2.5 py-1 text-xs text-rose-200 hover:bg-rose-500/10 disabled:opacity-40"
                    >
                      {t.verifyReject}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-[11px] text-zinc-500">
                    {t.verifySelfie}
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.selfieData}
                    alt="selfie"
                    className="max-h-72 w-full rounded-xl object-contain bg-black/40"
                  />
                </div>
                <div>
                  <div className="mb-1 text-[11px] text-zinc-500">
                    {t.verifyProfilePhotos}
                  </div>
                  {r.profilePhotos.length ? (
                    <div className="flex flex-wrap gap-2">
                      {r.profilePhotos.slice(0, 4).map((src, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={src}
                          alt=""
                          className="h-24 w-24 rounded-lg object-cover bg-black/40"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-500">—</div>
                  )}
                  {r.adminNote && (
                    <p className="mt-3 text-xs text-zinc-400">
                      {t.adminNote}: {r.adminNote}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
