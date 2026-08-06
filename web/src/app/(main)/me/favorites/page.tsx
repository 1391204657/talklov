"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProfileCard from "@/components/ProfileCard";
import { useApp } from "@/lib/store";
import {
  fetchMyFavoriteProfiles,
  fetchWhoFavoritedMe,
} from "@/lib/favorites";
import {
  defaultEntitlement,
  hasActiveVip,
  isFounderFrozen,
  type Entitlement,
  type PaidPlan,
} from "@/lib/entitlements";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type Tab = "mine" | "inbound";

export default function FavoritesPage() {
  const { userId, locale, openRegister } = useApp();
  const en = locale === "en";
  const [tab, setTab] = useState<Tab>("mine");
  const [mine, setMine] = useState<Profile[]>([]);
  const [inbound, setInbound] = useState<
    { id: string; createdAt: string; profile: Profile | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
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
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await fetchMyFavoriteProfiles(userId);
        if (!cancelled) setMine(list);
        if (userId && vip) {
          const who = await fetchWhoFavoritedMe(userId);
          if (!cancelled) setInbound(who);
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
          {en ? "Favorites" : "我的收藏"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {en
            ? "Sign in to save people and revisit them later."
            : "登录后可以收藏感兴趣的人，稍后再打招呼。"}
        </p>
        <button
          type="button"
          onClick={() => openRegister(en ? "Save favorites" : "收藏感兴趣的人")}
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
            {en ? "Favorites" : "收藏"}
          </h1>
        </div>
        <div className="mt-3 flex gap-2">
          {(
            [
              ["mine", en ? "Saved" : "我收藏的"],
              ["inbound", en ? "Who saved me" : "谁收藏了我"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                tab === id
                  ? "bg-accent/15 font-medium text-accent"
                  : "glass text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="p-10 text-center text-sm text-muted">
          {en ? "Loading…" : "加载中…"}
        </div>
      ) : tab === "mine" ? (
        mine.length === 0 ? (
          <div className="space-y-3 px-4 py-10 text-center">
            <p className="text-sm text-muted">
              {en
                ? "No favorites yet. Tap ♥ on a card to save someone."
                : "还没有收藏。在发现页点 ♥ 先存着，晚点再打招呼。"}
            </p>
            <Link href="/discover" className="text-sm font-medium text-accent">
              {en ? "Browse Discover →" : "去发现页看看 →"}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 px-3 pt-3">
            {mine.map((p) => (
              <ProfileCard key={p.id} profile={p} />
            ))}
          </div>
        )
      ) : !vip ? (
        <div className="mx-4 mt-6 space-y-3 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-400/10 p-5">
          <h2 className="font-semibold">
            {en ? "VIP: see who saved you" : "VIP：查看谁收藏了你"}
          </h2>
          <p className="text-sm text-muted">
            {en
              ? "Saving people is free. Seeing who favorited you is a VIP perk — same idea as “who liked you”."
              : "收藏别人免费；查看「谁收藏了我」是 VIP 权益，类似交友 App 的「谁喜欢了我」。"}
          </p>
          <Link
            href="/me/membership"
            className="btn-grad inline-flex w-full items-center justify-center rounded-2xl py-3.5 font-semibold"
          >
            {en ? "Upgrade to VIP" : "开通 VIP"}
          </Link>
        </div>
      ) : inbound.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted">
          {en
            ? "Nobody has favorited you yet. Keep your profile fresh."
            : "还没有人收藏你。完善资料、多上线会更容易被看到。"}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-3 pt-3">
          {inbound.map((row) =>
            row.profile ? (
              <ProfileCard key={row.id} profile={row.profile} />
            ) : (
              <div
                key={row.id}
                className="rounded-[1.35rem] border border-line bg-surface p-4 text-sm text-muted"
              >
                {en ? "Member" : "用户"} · {row.createdAt.slice(0, 10)}
              </div>
            )
          )}
        </div>
      )}
    </main>
  );
}
