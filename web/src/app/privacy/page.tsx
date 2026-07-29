"use client";

import Link from "next/link";
import {
  MarketingFooter,
  MarketingNav,
} from "@/components/marketing/MarketingChrome";
import { marketingCopy, type MarketingLocale } from "@/lib/marketingCopy";
import { privacySections } from "@/lib/legalCopy";
import { useApp } from "@/lib/store";

export default function PrivacyPage() {
  const { locale } = useApp();
  const lang = (locale === "en" ? "en" : "zh") as MarketingLocale;
  const t = marketingCopy[lang];
  const sections = privacySections[lang];

  return (
    <div className="marketing-site min-h-dvh overflow-x-hidden">
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← {t.navHome}
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {t.navPrivacy}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {lang === "zh"
            ? "更新日期：2026-07-28（演示草案）"
            : "Updated: 2026-07-28 (draft)"}
        </p>
        <div className="mt-8 space-y-6">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-lg font-bold">{s.h}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.p}</p>
            </section>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
