"use client";

import Link from "next/link";
import {
  MarketingFooter,
  MarketingNav,
} from "@/components/marketing/MarketingChrome";
import { faqItems, marketingCopy, type MarketingLocale } from "@/lib/marketingCopy";
import { useApp } from "@/lib/store";

export default function FaqPage() {
  const { locale } = useApp();
  const lang = (locale === "en" ? "en" : "zh") as MarketingLocale;
  const t = marketingCopy[lang];
  const items = faqItems[lang];

  return (
    <div className="marketing-site min-h-dvh">
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← {t.navHome}
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {t.faqTitle}
        </h1>
        <p className="mt-2 text-sm text-muted">{t.slogan}</p>
        <div className="mt-8 space-y-3">
          {items.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-line bg-surface/50 px-5 py-4 open:bg-surface"
            >
              <summary className="cursor-pointer list-none font-semibold">
                <span className="flex items-center justify-between gap-3">
                  {item.q}
                  <span className="text-muted transition group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
