"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/discover",
    label: "发现",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16.5 16.5 21 21" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/messages",
    label: "消息",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path
          d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 3v-3H7.5A2.5 2.5 0 0 1 5 13.5v-7Z"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/moments",
    label: "动态",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path
          d="m12 4 1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4Z"
          strokeLinejoin="round"
        />
        <path d="m18.5 15 .9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/learn",
    label: "学习",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 19.5V7.2c0-.7.4-1.3 1-1.6L12 3l7 2.6c.6.3 1 .9 1 1.6v12.3" strokeLinecap="round" />
        <path d="M12 3v16.5" strokeLinecap="round" />
        <path d="M4 19.5 12 17l8 2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/me",
    label: "我的",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 19.2c1.4-3 4-4.5 6.5-4.5s5.1 1.5 6.5 4.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function TabBar() {
  const path = usePathname();
  return (
    <nav className="sticky bottom-0 z-30 border-t border-line bg-surface/80 backdrop-blur-xl">
      <div className="grid grid-cols-5">
        {tabs.map((t) => {
          const active = path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] transition ${
                active ? "text-accent" : "text-muted"
              }`}
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
