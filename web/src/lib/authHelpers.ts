/** Shared auth helpers for OAuth / email / SMS OTP. */

export type OAuthProvider = "google" | "apple";

export function isValidEmail(raw: string): boolean {
  const e = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/** Map Supabase / provider auth errors to UI-friendly copy. */
export function friendlyAuthError(
  raw: string | undefined | null,
  locale: "zh" | "en"
): string {
  const msg = (raw || "").trim();
  const lower = msg.toLowerCase();
  const zh = locale !== "en";

  if (
    /token has expired|otp.*expired|expired.*otp|code.*expired|expired or is invalid/i.test(
      lower
    )
  ) {
    return zh
      ? "验证码无效或已过期，请重新获取"
      : "Code expired or invalid. Request a new one.";
  }
  if (/invalid.*(otp|token|code)|otp.*invalid|token.*invalid/i.test(lower)) {
    return zh ? "验证码不正确，请重试" : "Incorrect code. Please try again.";
  }
  if (/too many|rate limit|security purposes/i.test(lower)) {
    return zh
      ? "操作过于频繁，请稍后再试"
      : "Too many attempts. Please wait and try again.";
  }
  if (/user already registered|already been registered/i.test(lower)) {
    return zh ? "该账号已注册，请直接登录" : "Account already exists. Please sign in.";
  }
  if (/email.*not.*confirm|confirm.*email/i.test(lower)) {
    return zh ? "请先确认邮箱后再登录" : "Please confirm your email first.";
  }
  if (/magic link|sending|smtp|error sending/i.test(lower)) {
    return zh
      ? "邮件发送失败。请检查邮箱地址后重试，或稍后再试。"
      : "Could not send email. Check the address and try again.";
  }
  if (!msg) {
    return zh ? "操作失败，请重试" : "Something went wrong. Please try again.";
  }
  return msg;
}

/** Demo SMS OTP only when explicitly enabled (local/dev). Never rely on this in prod. */
export function allowDemoOtp(): boolean {
  if (process.env.NEXT_PUBLIC_ALLOW_DEMO_OTP === "1") return true;
  return process.env.NODE_ENV === "development";
}

/** Browser origin + path for Supabase OAuth / email redirect. */
export function authCallbackUrl(nextPath = "/discover"): string {
  if (typeof window === "undefined") {
    const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
    return `/auth/callback?next=${encodeURIComponent(next)}`;
  }
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

export function siteOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://talklov.com"
  );
}
