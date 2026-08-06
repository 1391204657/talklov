"use client";

import Link from "next/link";
import {
  MarketingFooter,
  MarketingNav,
} from "@/components/marketing/MarketingChrome";
import { marketingCopy, type MarketingLocale } from "@/lib/marketingCopy";
import { useApp } from "@/lib/store";

export default function PartnersPage() {
  const { locale } = useApp();
  const lang = (locale === "en" ? "en" : "zh") as MarketingLocale;
  const t = marketingCopy[lang];
  const mailto = `mailto:${t.partnersEmail}?subject=${encodeURIComponent(
    lang === "en" ? "TalkLov affiliate" : "TalkLov 推广合作"
  )}`;

  const steps = [
    { t: t.partnersHow1t, d: t.partnersHow1d, n: "01" },
    { t: t.partnersHow2t, d: t.partnersHow2d, n: "02" },
    { t: t.partnersHow3t, d: t.partnersHow3d, n: "03" },
  ];

  return (
    <div className="marketing-site min-h-dvh">
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← {t.navHome}
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {t.partnersTitle}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted sm:text-base">
          {t.partnersSub}
        </p>

        <h2 className="mt-10 text-xl font-semibold tracking-tight">
          {t.partnersHowTitle}
        </h2>
        <div className="mt-5 space-y-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-line bg-surface/50 px-5 py-4"
            >
              <div className="text-xs font-semibold text-muted">{s.n}</div>
              <div className="mt-1 font-semibold">{s.t}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <a
            href={mailto}
            className="inline-flex items-center justify-center rounded-full bg-[#1c1c1f] px-8 py-3.5 text-base font-semibold text-white shadow-[0_12px_32px_rgba(0,0,0,0.22)]"
          >
            {t.partnersCta}
          </a>
          <p className="mt-3 text-sm text-muted">
            {t.partnersMailNote}
            <br />
            <span className="text-foreground/80">{t.partnersEmail}</span>
          </p>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
