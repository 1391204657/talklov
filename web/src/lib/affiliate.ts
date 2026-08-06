/** Affiliate / KOL referral helpers (client + server). */

export const AFFILIATE_COOKIE = "talklov_ref";
export const AFFILIATE_COOKIE_MAX_AGE_SEC = 90 * 24 * 60 * 60; // 90 days

export function normalizeAffiliateCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().toLowerCase();
  if (!/^[a-z0-9_-]{2,32}$/.test(code)) return null;
  return code;
}

/** Read cookie value from document.cookie (browser only). */
export function readAffiliateCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${AFFILIATE_COOKIE}=`));
  if (!match) return null;
  return normalizeAffiliateCode(decodeURIComponent(match.split("=").slice(1).join("=")));
}

/** Persist first-touch referral (does not overwrite existing cookie). */
export function captureAffiliateCode(raw: string | null | undefined): string | null {
  const code = normalizeAffiliateCode(raw);
  if (!code || typeof document === "undefined") return null;
  if (readAffiliateCookie()) return readAffiliateCookie();
  document.cookie = `${AFFILIATE_COOKIE}=${encodeURIComponent(code)}; path=/; max-age=${AFFILIATE_COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
  return code;
}

export function commissionCents(amountCents: number, rateBps: number): number {
  if (amountCents <= 0 || rateBps <= 0) return 0;
  return Math.floor((amountCents * rateBps) / 10000);
}
