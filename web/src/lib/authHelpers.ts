/** Shared auth helpers for OAuth / email / SMS OTP. */

export type OAuthProvider = "google" | "apple";

export function isValidEmail(raw: string): boolean {
  const e = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
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
