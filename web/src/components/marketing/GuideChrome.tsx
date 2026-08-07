"use client";

import {
  MarketingFooter,
  MarketingNav,
} from "@/components/marketing/MarketingChrome";

/** Client chrome around server-rendered guide article HTML (good for crawlers). */
export default function GuideChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-site min-h-dvh">
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
