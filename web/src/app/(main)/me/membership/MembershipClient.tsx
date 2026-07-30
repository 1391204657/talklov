"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import FounderBadge from "@/components/FounderBadge";
import {
  catalogForRegion,
  defaultEntitlement,
  hasActiveBoost,
  hasActiveVip,
  isFounderFrozen,
  resolveRegion,
  type Entitlement,
  type PaidPlan,
} from "@/lib/entitlements";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function MembershipClient() {
  const { locale, myProfile, userId, tier, region } = useApp();
  const en = locale === "en";
  const params = useSearchParams();
  const [ent, setEnt] = useState<Entitlement>(defaultEntitlement);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const priceRegion = resolveRegion(
    myProfile.country || region,
    locale === "en" ? "en" : "zh"
  );
  const catalog = useMemo(() => catalogForRegion(priceRegion), [priceRegion]);

  useEffect(() => {
    if (params.get("success")) {
      setBanner(
        en
          ? "Payment received — VIP will activate in a few seconds."
          : "支付成功，VIP 权益将在几秒内生效。"
      );
    } else if (params.get("canceled")) {
      setBanner(en ? "Checkout canceled." : "已取消结账。");
    }
  }, [params, en]);

  useEffect(() => {
    if (!userId) return;
    const sb = getSupabaseBrowser();
    if (!sb) return;
    let cancelled = false;
    (async () => {
      const { data } = await sb
        .from("profiles")
        .select(
          "plan,plan_expires_at,is_founder,founder_slot,founder_granted_at,founder_last_active_at,boost_until,stripe_customer_id"
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
        stripeCustomerId: (data.stripe_customer_id as string) || null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, banner]);

  const vip = hasActiveVip(ent);
  const boosted = hasActiveBoost(ent);

  const checkout = async (catalogId: string) => {
    setErr(null);
    setBusy(catalogId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalogId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(null);
    }
  };

  const openPortal = async () => {
    setErr(null);
    setBusy("portal");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Portal failed");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Portal failed");
    } finally {
      setBusy(null);
    }
  };

  if (tier === "guest" && !userId) {
    return (
      <main className="p-4">
        <p className="text-sm text-muted">
          {en ? "Sign in to manage membership." : "登录后管理会员。"}
        </p>
        <Link href="/me" className="mt-3 inline-block text-sm text-accent">
          ← {en ? "Back" : "返回"}
        </Link>
      </main>
    );
  }

  return (
    <main className="space-y-4 p-4 pb-10">
      <header className="flex items-center justify-between">
        <Link href="/me" className="text-sm text-muted">
          ← {en ? "Back" : "返回"}
        </Link>
        <h1 className="text-base font-semibold">
          {en ? "Membership" : "会员与订阅"}
        </h1>
        <span className="w-10" />
      </header>

      {banner && (
        <div className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
          {banner}
        </div>
      )}
      {err && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {err}
        </div>
      )}

      <section className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-semibold">
            {vip
              ? ent.plan === "founder"
                ? en
                  ? "Founder VIP"
                  : "创世 VIP"
                : "VIP"
              : en
                ? "Free"
                : "免费版"}
          </span>
          {ent.isFounder && (
            <FounderBadge
              slot={ent.founderSlot}
              frozen={ent.founderFrozen}
              locale={locale}
            />
          )}
        </div>
        <p className="mt-1 text-xs text-muted">
          {en
            ? "Verification (trust) and VIP (paid) are separate. Verify to chat; VIP unlocks limits & visibility."
            : "真人认证（信任）与 VIP（付费）分开：认证才能聊天，VIP 提升额度与曝光。"}
        </p>
        {ent.planExpiresAt && vip && ent.plan === "vip" && (
          <p className="mt-2 text-xs text-muted">
            {en ? "Renews / ends: " : "到期："}
            {new Date(ent.planExpiresAt).toLocaleString()}
          </p>
        )}
        {boosted && (
          <p className="mt-2 text-xs text-accent">
            {en ? "Boost active until " : "曝光加持至 "}
            {new Date(ent.boostUntil!).toLocaleString()}
          </p>
        )}
        {ent.stripeCustomerId && (
          <button
            type="button"
            onClick={openPortal}
            disabled={busy === "portal"}
            className="mt-3 rounded-full border border-line px-3 py-1.5 text-xs"
          >
            {busy === "portal"
              ? "…"
              : en
                ? "Manage billing"
                : "管理订阅 / 发票"}
          </button>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="font-semibold">{en ? "What you get" : "VIP 权益"}</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-muted">
          <li>· {en ? "More daily hellos (men)" : "打招呼额度提升（男）"}</li>
          <li>
            · {en ? "Unlimited AI icebreakers / polish" : "AI 破冰 / 润色不限次"}
          </li>
          <li>· {en ? "Unlimited translate" : "翻译不限次"}</li>
          <li>· {en ? "See who liked / viewed you" : "查看谁喜欢 / 看过我"}</li>
          <li>· {en ? "Priority discover ranking" : "发现页优先曝光"}</li>
          <li>· {en ? "Advanced filters" : "高级筛选"}</li>
        </ul>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="font-semibold">
            {priceRegion === "CN"
              ? en
                ? "China pricing (CNY)"
                : "中国区定价（人民币）"
              : en
                ? "US pricing (USD)"
                : "美区定价（美元）"}
          </h2>
          <span className="text-[11px] text-muted">Stripe</span>
        </div>
        {catalog.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={!!busy || (vip && item.kind === "subscription")}
            onClick={() => void checkout(item.id)}
            className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 text-left disabled:opacity-50"
          >
            <div>
              <div className="text-sm font-semibold">
                {en ? item.titleEn : item.titleZh}
                {item.hintZh && (
                  <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent">
                    {en ? item.hintEn : item.hintZh}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted">
                {en ? item.priceLabelEn : item.priceLabelZh}
              </div>
            </div>
            <span className="text-sm font-medium text-accent">
              {busy === item.id ? "…" : en ? "Buy" : "购买"}
            </span>
          </button>
        ))}
        <p className="px-1 text-[11px] text-muted">
          {en
            ? "Configure Stripe Price IDs in env to enable checkout. Enable Apple Pay / Google Pay / Alipay / WeChat Pay in Stripe Dashboard."
            : "在环境变量配置 Stripe Price ID 后即可结账。可在 Stripe 后台开启 Apple Pay / Google Pay / 支付宝 / 微信支付。"}
        </p>
      </section>
    </main>
  );
}
