"use client";

import { useEffect, useState } from "react";
import { useAdminI18n } from "@/lib/adminI18n";

type Stats = {
  profilesTotal: number;
  profiles24h: number;
  vipActive: number;
  founders: number;
  favoritesTotal: number;
  views24h: number;
  purchases7d: number;
  affiliates: number;
  openReports: number;
  pendingVerify: number;
};

export default function AdminHomePage() {
  const { t } = useAdminI18n();
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/stats");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t.loadStatsFail);
        if (!cancelled) setStats(data);
      } catch (e) {
        if (!cancelled)
          setErr(e instanceof Error ? e.message : t.loadStatsFail);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t.loadStatsFail]);

  const cards: { label: string; key: keyof Stats }[] = [
    { label: t.statPendingVerify, key: "pendingVerify" },
    { label: t.statOpenReports, key: "openReports" },
    { label: t.statUsers, key: "profilesTotal" },
    { label: t.statNew24h, key: "profiles24h" },
    { label: t.statVip, key: "vipActive" },
    { label: t.statFounders, key: "founders" },
    { label: t.statFavorites, key: "favoritesTotal" },
    { label: t.statViews24h, key: "views24h" },
    { label: t.statPurchases7d, key: "purchases7d" },
    { label: t.statAffiliates, key: "affiliates" },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold">{t.overviewTitle}</h1>
      <p className="mt-1 text-sm text-zinc-400">{t.overviewSub}</p>

      {err && (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {err}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.key}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="text-xs text-zinc-400">{c.label}</div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">
              {stats ? stats[c.key] : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
