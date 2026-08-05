"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/store";
import { tApp } from "@/lib/appCopy";
import { subscribeInbox, totalUnread } from "@/lib/localInbox";

const tabIcons = {
  discover: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16.5 16.5 21 21" strokeLinecap="round" />
    </svg>
  ),
  messages: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path
        d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 3v-3H7.5A2.5 2.5 0 0 1 5 13.5v-7Z"
        strokeLinejoin="round"
      />
    </svg>
  ),
  moments: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path
        d="m12 4 1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4Z"
        strokeLinejoin="round"
      />
      <path d="m18.5 15 .9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z" strokeLinejoin="round" />
    </svg>
  ),
  learn: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 19.5V7.2c0-.7.4-1.3 1-1.6L12 3l7 2.6c.6.3 1 .9 1 1.6v12.3" strokeLinecap="round" />
      <path d="M12 3v16.5" strokeLinecap="round" />
      <path d="M4 19.5 12 17l8 2.5" strokeLinecap="round" />
    </svg>
  ),
};

export default function TabBar() {
  const path = usePathname();
  const { locale, tier, openRegister, applyUnreadBadge } = useApp();
  const c = tApp(locale);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const refresh = () => {
      const n = totalUnread();
      setUnread(n);
      applyUnreadBadge(n);
    };
    refresh();
    return subscribeInbox(refresh);
  }, [applyUnreadBadge]);

  const tabs = [
    { href: "/discover", label: c.tabDiscover, icon: tabIcons.discover },
    {
      href: "/messages",
      label: c.tabMessages,
      icon: tabIcons.messages,
      badge: unread,
    },
    { href: "/moments", label: c.tabMoments, icon: tabIcons.moments },
    { href: "/learn", label: c.tabLearn, icon: tabIcons.learn },
  ] as const;

  const onCompose = () => {
    if (tier === "guest") {
      openRegister(locale === "en" ? "post a moment" : "发布动态");
      return;
    }
    // Hard navigate — more reliable than router.push on CN WebKit
    window.location.assign("/moments/compose");
  };

  return (
    <nav
      className="relative z-[70] border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      aria-label="Primary"
      style={{ touchAction: "manipulation" }}
    >
      <div className="grid grid-cols-5 items-end">
        {tabs.slice(0, 2).map((t) => {
          const active = path.startsWith(t.href);
          const badge = "badge" in t ? t.badge : 0;
          return (
            <Link
              key={t.href}
              href={t.href}
              prefetch={false}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] transition ${
                active ? "text-accent" : "text-muted"
              }`}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              <span className={`relative ${active ? "opacity-100" : "opacity-80"}`}>
                {t.icon}
                {badge > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-white">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </span>
              {t.label}
            </Link>
          );
        })}

        <div className="relative flex justify-center pb-1.5 pt-1">
          <button
            type="button"
            onClick={onCompose}
            className="btn-grad flex h-12 w-12 -translate-y-2 items-center justify-center rounded-full text-2xl font-light leading-none text-white shadow-[0_10px_28px_rgba(200,120,180,0.45)]"
            aria-label={locale === "en" ? "New moment" : "发布动态"}
            style={{ touchAction: "manipulation" }}
          >
            +
          </button>
        </div>

        {tabs.slice(2).map((t) => {
          const active = path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              prefetch={false}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] transition ${
                active ? "text-accent" : "text-muted"
              }`}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              <span className={active ? "opacity-100" : "opacity-80"}>
                {t.icon}
              </span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
