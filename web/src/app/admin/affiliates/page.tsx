"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminI18n } from "@/lib/adminI18n";

type AffiliateRow = {
  id: string;
  code: string;
  display_name: string;
  contact_email: string | null;
  first_bps: number;
  renew_bps: number;
  active: boolean;
  notes: string | null;
  created_at: string;
  referredCount: number;
  commissionCount: number;
  pendingCents: number;
  payableCents: number;
  paidCents: number;
};

function money(cents: number, currency = "USD") {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

export default function AdminAffiliatesPage() {
  const { t } = useAdminI18n();
  const [rows, setRows] = useState<AffiliateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: "",
    displayName: "",
    contactEmail: "",
    firstPct: "20",
    renewPct: "10",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/affiliates");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.actionFail);
      setRows(data.affiliates || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.actionFail);
    } finally {
      setLoading(false);
    }
  }, [t.actionFail]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleActive = async (a: AffiliateRow) => {
    setBusyId(a.id);
    try {
      const res = await fetch("/api/admin/affiliates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: a.id, active: !a.active }),
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

  const markPaid = async (a: AffiliateRow) => {
    if (!window.confirm(t.affiliatesMarkPaidConfirm)) return;
    setBusyId(a.id);
    try {
      const res = await fetch("/api/admin/affiliates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: a.id, markPaid: true }),
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

  const createAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setErr(null);
    try {
      const firstPct = Number(form.firstPct);
      const renewPct = Number(form.renewPct);
      const res = await fetch("/api/admin/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          displayName: form.displayName,
          contactEmail: form.contactEmail || undefined,
          firstBps: Number.isFinite(firstPct) ? Math.round(firstPct * 100) : 2000,
          renewBps: Number.isFinite(renewPct) ? Math.round(renewPct * 100) : 1000,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.actionFail);
      setForm({
        code: "",
        displayName: "",
        contactEmail: "",
        firstPct: "20",
        renewPct: "10",
        notes: "",
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.actionFail);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold">{t.affiliatesTitle}</h1>
      <p className="mt-1 text-sm text-zinc-400">{t.affiliatesSub}</p>
      <p className="mt-2 text-[11px] text-zinc-500">
        {t.affiliatesHint}{" "}
        <code className="text-zinc-400">?ref=code</code>
      </p>

      {err && (
        <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {err}
        </div>
      )}

      <form
        onSubmit={(e) => void createAffiliate(e)}
        className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
      >
        <div className="text-sm font-medium text-zinc-200">
          {t.affiliatesCreate}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <label className="block text-xs text-zinc-400">
            {t.affiliatesCode}
            <input
              required
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="maya"
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none focus:border-sky-500/50"
            />
          </label>
          <label className="block text-xs text-zinc-400">
            {t.affiliatesName}
            <input
              required
              value={form.displayName}
              onChange={(e) =>
                setForm((f) => ({ ...f, displayName: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50"
            />
          </label>
          <label className="block text-xs text-zinc-400">
            {t.affiliatesEmail}
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) =>
                setForm((f) => ({ ...f, contactEmail: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-zinc-400">
              {t.affiliatesFirstPct}
              <input
                value={form.firstPct}
                onChange={(e) =>
                  setForm((f) => ({ ...f, firstPct: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50"
              />
            </label>
            <label className="block text-xs text-zinc-400">
              {t.affiliatesRenewPct}
              <input
                value={form.renewPct}
                onChange={(e) =>
                  setForm((f) => ({ ...f, renewPct: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50"
              />
            </label>
          </div>
          <label className="block text-xs text-zinc-400 md:col-span-2">
            {t.affiliatesNotes}
            <input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="mt-3 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
        >
          {t.affiliatesSubmit}
        </button>
      </form>

      {loading ? (
        <div className="mt-8 text-sm text-zinc-500">{t.loading}</div>
      ) : rows.length === 0 ? (
        <div className="mt-8 text-sm text-zinc-500">{t.affiliatesEmpty}</div>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {a.display_name}{" "}
                    <span className="font-mono text-sm text-sky-300">
                      {a.code}
                    </span>
                    {!a.active && (
                      <span className="ml-2 rounded-full bg-zinc-500/30 px-2 py-0.5 text-[11px] text-zinc-300">
                        {t.inactive}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    {a.contact_email || "—"} · {t.firstRate}:{" "}
                    {(a.first_bps / 100).toFixed(1)}% · {t.renewRate}:{" "}
                    {(a.renew_bps / 100).toFixed(1)}%
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {a.pendingCents + a.payableCents > 0 && (
                    <button
                      type="button"
                      disabled={busyId === a.id}
                      onClick={() => void markPaid(a)}
                      className="rounded-lg border border-emerald-500/40 px-2.5 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-40"
                    >
                      {t.affiliatesMarkPaid}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => void toggleActive(a)}
                    className="rounded-lg border border-white/15 px-2.5 py-1 text-xs hover:bg-white/5 disabled:opacity-40"
                  >
                    {a.active ? t.deactivate : t.activate}
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <div className="text-[11px] text-zinc-500">{t.referred}</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">
                    {a.referredCount}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <div className="text-[11px] text-zinc-500">{t.commPending}</div>
                  <div className="mt-1 text-sm font-semibold tabular-nums">
                    {money(a.pendingCents)}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <div className="text-[11px] text-zinc-500">{t.commPayable}</div>
                  <div className="mt-1 text-sm font-semibold tabular-nums">
                    {money(a.payableCents)}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <div className="text-[11px] text-zinc-500">{t.commPaid}</div>
                  <div className="mt-1 text-sm font-semibold tabular-nums">
                    {money(a.paidCents)}
                  </div>
                </div>
              </div>
              {a.notes && (
                <p className="mt-2 text-xs text-zinc-500">{a.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
