"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProfileCard from "@/components/ProfileCard";
import { useApp } from "@/lib/store";
import {
  countWhoViewedMe,
  fetchWhoViewedMe,
  type ProfileViewer,
} from "@/lib/profileViews";
import {
  defaultEntitlement,
  hasActiveVip,
  isFounderFrozen,
  type Entitlement,
  type PaidPlan,
} from "@/lib/entitlements";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function VisitorsPage() {
  const { userId, locale, openRegister } = useApp();
  const en = locale === "en";
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [list, setList] = useState<ProfileViewer[]>([]);
  const [ent, setEnt] = useState<Entitlement>(defaultEntitlement);

  useEffect(() => {
    if (!userId) return;
    const sb = getSupabaseBrowser();
    if (!sb) return;
    let cancelled = false;
    (async () => {
      const { data } = await sb
        .from("profiles")
        .select(
          "plan,plan_expires_at,is_founder,founder_slot,founder_granted_at,founder_last_active_at,boost_until"
        )
        .eq("id", userId)
        .maybeSingle();
      if (cancelled || !data) return;
      const last = data.founder_last_active_at as string | null;
      setEnt({
        plan: (data.plan as PaidPlan) || "free",
        planExpiresAt: (data.plan_expires_at as string) || null,
        isFounder: Boolean(data.is_founder),
        founderSlot: (data.founder_slot as number) || null,
        founderGrantedAt: (data.founder_granted_at as string) || null,
        founderLastActiveAt: last,
        founderFrozen: Boolean(data.is_founder) && isFounderFrozen(last),
        boostUntil: (data.boost_until as string) || null,
        stripeCustomerId: null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const vip = hasActiveVip(ent);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const n = await countWhoViewedMe(userId);
        if (!cancelled) setCount(n);
        if (vip) {
          const rows = await fetchWhoViewedMe(userId);
          if (!cancelled) setList(rows);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, vip]);

  if (!userId) {
    return (
      <main className="px-4 py-8">
        <h1 className="text-xl font-semibold">
          {en ? "Who viewed me" : "谁看了我"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {en
            ? "Sign in to see who’s checked your profile."
            : "登录后可查看谁看过你的主页。"}
        </p>
        <button
          type="button"
          onClick={() => openRegister(en ? "Who viewed me" : "谁看了我")}
          className="btn-grad mt-6 w-full rounded-2xl py-3.5 font-semibold"
        >
          {en ? "Sign in / Register" : "登录 / 注册"}
        </button>
      </main>
    );
  }

  return (
    <main className="pb-8">
      <header className="sticky top-0 z-20 border-b border-line/60 bg-background/80 px-4 pb-3 pt-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link href="/me" className="text-sm text-muted">
            ←
          </Link>
          <h1 className="text-lg font-semibold">
            {en ? "Who viewed me" : "谁看了我"}
          </h1>
        </div>
      </header>

      {loading ? (
        <div className="p-10 text-center text-sm text-muted">
          {en ? "Loading…" : "加载中…"}
        </div>
      ) : !vip ? (
        <div className="mx-4 mt-6 space-y-3 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-400/10 p-5">
          <h2 className="font-semibold">
            {en ? "VIP: see who viewed you" : "VIP：查看谁看了你"}
          </h2>
          <p className="text-sm text-muted">
            {count > 0
              ? en
                ? `${count} people viewed your profile. Upgrade to see who.`
                : `有 ${count} 人看过你的主页。开通 VIP 查看是谁。`
              : en
                ? "When someone opens your profile, you’ll see them here with VIP."
                : "有人打开你的主页后，VIP 可在这里看到是谁。"}
          </p>
          <Link
            href="/me/membership"
            className="btn-grad inline-flex w-full items-center justify-center rounded-2xl py-3.5 font-semibold"
          >
            {en ? "Upgrade to VIP" : "开通 VIP"}
          </Link>
        </div>
      ) : list.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted">
          {en
            ? "No profile views yet. Keep your photos and bio fresh."
            : "还没有人看过你。完善照片和简介，曝光会更高。"}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-3 pt-3">
          {list.map((row) =>
            row.profile ? (
              <div key={row.id} className="relative">
                <ProfileCard profile={row.profile} />
                <div className="pointer-events-none absolute inset-x-2 bottom-2 rounded-full bg-black/55 px-2 py-0.5 text-center text-[10px] text-white">
                  {en ? "Viewed" : "看过"} · {row.lastViewedAt.slice(0, 10)}
                </div>
              </div>
            ) : (
              <div
                key={row.id}
                className="rounded-[1.35rem] border border-line bg-surface p-4 text-sm text-muted"
              >
                {en ? "Member" : "用户"} · {row.lastViewedAt.slice(0, 10)}
              </div>
            )
          )}
        </div>
      )}
    </main>
  );
}
