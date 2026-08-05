"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { AdminLangSwitch, useAdminI18n } from "@/lib/adminI18n";

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M3 3l18 18" strokeLinecap="round" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" strokeLinecap="round" />
        <path
          d="M9.9 5.1A10.4 10.4 0 0 1 12 5c5 0 9.3 3.1 11 7.5a12.3 12.3 0 0 1-4.2 5.1M6.1 6.1A12.4 12.4 0 0 0 1 12.5C2.7 16.9 7 20 12 20c1.6 0 3.1-.3 4.5-.9"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function AdminLoginPage() {
  const router = useRouter();
  const { t, locale } = useAdminI18n();
  const [email, setEmail] = useState("admin@talklov.com");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const mapAuthError = (message: string) => {
    const m = message.toLowerCase();
    if (m.includes("invalid login credentials")) {
      return locale === "zh"
        ? "邮箱或密码不对。用眼睛图标核对密码。"
        : "Wrong email or password. Use the eye icon to check.";
    }
    if (m.includes("email not confirmed")) {
      return locale === "zh"
        ? "邮箱尚未确认：请打开 Spacemail 点确认链接后再登录。"
        : "Email not confirmed — check Spacemail for the confirm link.";
    }
    return message;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setBusy(true);
    try {
      const sb = getSupabaseBrowser();
      if (!sb) throw new Error("Supabase not configured");

      const cleanEmail = email.trim().toLowerCase();
      const { error } = await sb.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) throw error;

      const me = await fetch("/api/admin/me");
      if (!me.ok) {
        await sb.auth.signOut();
        throw new Error(
          me.status === 403
            ? locale === "zh"
              ? "此邮箱不在管理员白名单（ADMIN_EMAILS）。"
              : "This email is not on the admin whitelist (ADMIN_EMAILS)."
            : locale === "zh"
              ? "无法验证管理员身份。"
              : "Could not verify admin access."
        );
      }
      router.replace("/admin");
    } catch (ex) {
      const raw = ex instanceof Error ? ex.message : "Login failed";
      setErr(mapAuthError(raw));
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {
    setErr(null);
    setInfo(null);
    setBusy(true);
    try {
      const sb = getSupabaseBrowser();
      if (!sb) throw new Error("Supabase not configured");
      const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/admin/login`,
      });
      if (error) throw error;
      setInfo(
        locale === "zh"
          ? "已发送重置密码邮件，请到 Spacemail 查收。"
          : "Password reset email sent — check Spacemail."
      );
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.loginTitle}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {t.loginHint}{" "}
            <span className="text-zinc-200">admin@talklov.com</span>
          </p>
          <p className="mt-2 text-[11px] text-zinc-500">{t.loginNoSignup}</p>
        </div>
        <AdminLangSwitch />
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-xs text-zinc-400">
          {t.email}
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-white/30"
          />
        </label>

        <label className="block text-xs text-zinc-400">
          {t.password}
          <div className="relative mt-1">
            <input
              type={showPw ? "text" : "password"}
              required
              minLength={6}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-3 pr-11 text-sm outline-none focus:border-white/30"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-zinc-400 hover:text-white"
              aria-label={showPw ? t.hidePassword : t.showPassword}
              title={showPw ? t.hidePassword : t.showPassword}
            >
              <EyeIcon open={showPw} />
            </button>
          </div>
        </label>

        {err && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {err}
          </div>
        )}
        {info && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {info}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-black disabled:opacity-50"
        >
          {busy ? "…" : t.signIn}
        </button>
      </form>

      <div className="mt-4 flex flex-col gap-2 text-xs text-zinc-500">
        <button
          type="button"
          disabled={busy || !email.trim()}
          onClick={() => void sendReset()}
          className="text-left hover:text-zinc-300 disabled:opacity-40"
        >
          {t.forgot}
        </button>
      </div>
    </div>
  );
}
