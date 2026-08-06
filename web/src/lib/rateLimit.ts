/**
 * Simple in-memory sliding window rate limit (per server instance).
 * Good enough to blunt abuse on edge/serverless; not a global store.
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

/** Returns true if allowed, false if over limit. */
export function rateLimitAllow(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const cut = now - windowMs;
  let b = buckets.get(key);
  if (!b) {
    b = { timestamps: [] };
    buckets.set(key, b);
  }
  b.timestamps = b.timestamps.filter((t) => t > cut);
  if (b.timestamps.length >= limit) {
    const oldest = b.timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  b.timestamps.push(now);
  // Cap map size loosely
  if (buckets.size > 5000) {
    const first = buckets.keys().next().value;
    if (first) buckets.delete(first);
  }
  return { ok: true };
}

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
