"use client";

import Image from "next/image";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { marketingCopy, type MarketingLocale } from "@/lib/marketingCopy";

export function MarketingNav() {
  const { locale, setLocale, openRegister } = useApp();
  const lang = (locale === "en" ? "en" : "zh") as MarketingLocale;
  const t = marketingCopy[lang];

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 max-w-[68%] items-center gap-3 sm:max-w-none">
          <Image
            src="/brand/talklov-logo.png"
            alt="TalkLov"
            width={48}
            height={48}
            className="h-10 w-10 shrink-0 object-contain sm:h-11 sm:w-11"
            priority
            unoptimized
          />
          <span className="min-w-0 truncate leading-tight tracking-tight">
            <span className="text-xl font-extrabold text-foreground sm:text-2xl">
              TalkLov
            </span>
            <span className="ml-1.5 hidden text-[12px] font-normal text-foreground/75 sm:ml-2 lg:inline lg:text-sm">
              — {t.slogan.replace(/^TalkLov\s*[—–-]\s*/, "")}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          <a href="#how" className="hover:text-foreground">
            {t.howTitle}
          </a>
          <Link href="/faq" className="hover:text-foreground">
            {t.navFaq}
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            {t.navTerms}
          </Link>
          <a href="#download" className="hover:text-foreground">
            {t.navDownload}
          </a>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <div
            className="flex rounded-full border border-line bg-surface/80 p-0.5 text-xs"
            role="group"
            aria-label={t.langLabel}
          >
            {(["zh", "en"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setLocale(id)}
                className={`inline-flex h-8 w-11 items-center justify-center rounded-full text-[11px] font-medium transition sm:w-12 ${
                  lang === id
                    ? "bg-foreground text-background"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {id === "zh" ? "中文" : "EN"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => openRegister()}
            className="rounded-full border border-line bg-surface/80 px-3.5 py-2 text-sm font-semibold text-foreground hover:bg-surface sm:px-4"
          >
            {t.navLogin}
          </button>
          <Link
            href="/discover"
            className="hidden rounded-full bg-[#1c1c1f] px-4 py-2 text-sm font-semibold text-white sm:inline-flex"
          >
            {t.navOpenApp}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  const { locale } = useApp();
  const lang = (locale === "en" ? "en" : "zh") as MarketingLocale;
  const t = marketingCopy[lang];

  return (
    <footer className="border-t border-line bg-surface/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <Image
            src="/brand/talklov-logo.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
            unoptimized
          />
          <div>
            <div className="font-bold">{t.brand}</div>
            <p className="mt-1 max-w-sm text-sm text-muted">{t.footerTagline}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <Link href="/faq" className="hover:text-foreground">
            {t.navFaq}
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            {t.navTerms}
          </Link>
          <a href="#download" className="hover:text-foreground">
            {t.navDownload}
          </a>
          <Link href="/discover" className="hover:text-foreground">
            {t.navOpenApp}
          </Link>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-muted">
        {t.footerRights}
      </div>
    </footer>
  );
}
