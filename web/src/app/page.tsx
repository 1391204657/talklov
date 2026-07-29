"use client";

import Image from "next/image";
import Link from "next/link";
import { useApp } from "@/lib/store";
import {
  MarketingFooter,
  MarketingNav,
} from "@/components/marketing/MarketingChrome";
import { DeviceShowcase } from "@/components/marketing/DeviceShowcase";
import { VideoCallDuo } from "@/components/marketing/VideoCallDuo";
import { FlagBadge } from "@/components/marketing/FlagBadge";
import {
  faqItems,
  marketingCopy,
  type MarketingLocale,
} from "@/lib/marketingCopy";

export default function MarketingHome() {
  const { locale } = useApp();
  const lang = (locale === "en" ? "en" : "zh") as MarketingLocale;
  const t = marketingCopy[lang];
  const faqs = faqItems[lang].slice(0, 4);

  return (
    <div className="marketing-site min-h-dvh overflow-x-hidden">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-x-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(90% 60% at 10% -10%, rgba(244,180,205,0.55), transparent 55%), radial-gradient(70% 50% at 95% 10%, rgba(155,180,245,0.5), transparent 50%), radial-gradient(60% 40% at 50% 100%, rgba(186,220,240,0.35), transparent 45%)",
          }}
        />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 overflow-x-hidden px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-6 lg:pb-24 lg:pt-16">
          <div className="min-w-0">
            <FlagBadge label={t.badge} />

            <h1 className="max-w-xl text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl">
              {t.heroTitle}
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted sm:text-base">
              {t.heroSub}
            </p>

            <div className="mt-8">
              <Link
                href="/discover"
                className="inline-flex items-center justify-center rounded-full bg-[#1c1c1f] px-8 py-3.5 text-base font-semibold text-white shadow-[0_12px_32px_rgba(0,0,0,0.22)]"
              >
                {t.ctaBrowse}
              </Link>
            </div>
          </div>

          {/* Twin FaceTime phones: US man ↔ Chinese woman */}
          <div className="relative mx-auto w-full min-w-0 max-w-full">
            <VideoCallDuo />
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="border-t border-line/50 bg-surface/30 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            {t.howTitle}
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { t: t.how1t, d: t.how1d, n: "01" },
              { t: t.how2t, d: t.how2d, n: "02" },
              { t: t.how3t, d: t.how3d, n: "03" },
            ].map((s) => (
              <div
                key={s.n}
                className="rounded-3xl border border-line bg-background/80 p-6 backdrop-blur"
              >
                <div className="text-xs font-semibold tracking-widest text-accent">
                  {s.n}
                </div>
                <div className="mt-3 text-lg font-bold">{s.t}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            {t.featuresTitle}
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { t: t.f1t, d: t.f1d },
              { t: t.f2t, d: t.f2d },
              { t: t.f3t, d: t.f3d },
            ].map((f) => (
              <div
                key={f.t}
                className="rounded-3xl border border-line bg-surface/60 p-6"
              >
                <div className="text-lg font-bold">{f.t}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Devices */}
      <section className="border-y border-line/50 bg-surface/25 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            {t.devicesTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted">
            {t.devicesSub}
          </p>
          <div className="mt-12">
            <DeviceShowcase
              phoneCaption={t.phoneCaption}
              tabletCaption={t.tabletCaption}
            />
          </div>
        </div>
      </section>

      {/* FAQ teaser */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            {t.faqTitle}
          </h2>
          <div className="mt-8 space-y-3">
            {faqs.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-line bg-surface/50 px-5 py-4"
              >
                <summary className="cursor-pointer list-none font-semibold marker:content-none">
                  <span className="flex items-center justify-between gap-3">
                    {item.q}
                    <span className="text-muted transition group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href="/faq" className="text-sm font-medium text-accent">
              {t.faqMore} →
            </Link>
          </div>
        </div>
      </section>

      {/* Download */}
      <section id="download" className="pb-20 pt-4">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="rounded-[2rem] border border-line bg-[linear-gradient(145deg,rgba(240,160,189,0.25),rgba(155,140,242,0.18),rgba(155,184,245,0.22))] p-8 text-center backdrop-blur sm:p-12">
            <Image
              src="/brand/talklov-logo.png"
              alt=""
              width={64}
              height={64}
              className="mx-auto h-16 w-16 object-contain"
              unoptimized
            />
            <h2 className="mt-4 text-3xl font-bold">{t.downloadTitle}</h2>
            <p className="mt-2 text-sm text-muted">{t.downloadSub}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/discover"
                className="inline-flex items-center justify-center rounded-full bg-[#1c1c1f] px-6 py-3.5 text-sm font-semibold text-white"
              >
                {t.downloadWeb}
              </Link>
              <button
                type="button"
                disabled
                className="rounded-full border border-line bg-background/70 px-6 py-3.5 text-sm font-semibold text-muted opacity-70"
              >
                {t.downloadIos}
              </button>
              <button
                type="button"
                disabled
                className="rounded-full border border-line bg-background/70 px-6 py-3.5 text-sm font-semibold text-muted opacity-70"
              >
                {t.downloadAndroid}
              </button>
            </div>
            <p className="mt-5 text-xs leading-relaxed text-muted">
              {t.downloadHint}
            </p>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
