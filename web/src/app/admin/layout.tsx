"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  AdminI18nProvider,
  AdminLangSwitch,
  useAdminI18n,
} from "@/lib/adminI18n";

function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useAdminI18n();
  const isLogin = pathname === "/admin/login";
  const [checking, setChecking] = useState(!isLogin);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (isLogin) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/me");
        if (!res.ok) {
          router.replace("/admin/login");
          return;
        }
        const data = await res.json();
        if (!cancelled) setEmail(data.email || null);
      } catch {
        router.replace("/admin/login");
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLogin, router, pathname]);

  const signOut = async () => {
    const sb = getSupabaseBrowser();
    await sb?.auth.signOut();
    router.replace("/admin/login");
  };

  if (isLogin) {
    return (
      <div className="min-h-screen bg-[#0f1115] text-zinc-100">{children}</div>
    );
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1115] text-sm text-zinc-400">
        {t.checking}
      </div>
    );
  }

  const nav = [
    { href: "/admin", label: t.overview },
    { href: "/admin/users", label: t.users },
    { href: "/admin/verifications", label: t.verifications },
    { href: "/admin/reports", label: t.reports },
    { href: "/admin/affiliates", label: t.affiliates },
    { href: "/admin/audit", label: t.audit },
  ];

  return (
    <div className="min-h-screen bg-[#0f1115] text-zinc-100">
      <header className="border-b border-white/10 bg-black/30">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <Link href="/admin" className="shrink-0 text-sm font-semibold tracking-wide">
              {t.brand}
            </Link>
            <nav className="flex gap-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    pathname === item.href
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs text-zinc-400 sm:gap-3">
            <AdminLangSwitch />
            <span className="hidden md:inline">{email}</span>
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg border border-white/15 px-2.5 py-1 hover:bg-white/5"
            >
              {t.signOut}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminI18nProvider>
      <AdminShell>{children}</AdminShell>
    </AdminI18nProvider>
  );
}
