/** Discover feed ranking: daily shuffle + seen demotion + boost. */

const SEEN_KEY = "talklov_discover_seen_v1";

function dayKey(d = new Date()): string {
  // Local calendar day
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic PRNG (mulberry32). */
function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function readSeenMap(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const obj = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function writeSeenMap(map: Record<string, string[]>) {
  if (typeof window === "undefined") return;
  try {
    // Keep last 7 days only
    const keys = Object.keys(map).sort();
    const trimmed: Record<string, string[]> = {};
    for (const k of keys.slice(-7)) trimmed[k] = map[k];
    localStorage.setItem(SEEN_KEY, JSON.stringify(trimmed));
  } catch {}
}

export function markDiscoverSeen(ids: string[]) {
  if (!ids.length || typeof window === "undefined") return;
  const map = readSeenMap();
  const today = dayKey();
  const set = new Set(map[today] || []);
  for (const id of ids) if (id) set.add(id);
  map[today] = [...set];
  writeSeenMap(map);
}

export function getTodaySeenIds(): Set<string> {
  const map = readSeenMap();
  return new Set(map[dayKey()] || []);
}

export type RankableProfile = {
  id: string;
  online?: boolean;
  boostUntil?: string | null;
};

/**
 * Rank discover cards for a viewer.
 * - Active Boost first
 * - Online next
 * - Unseen today before seen today
 * - Daily seeded shuffle within buckets (same day ≈ stable; new day reshuffles)
 */
export function rankDiscoverProfiles<T extends RankableProfile>(
  profiles: T[],
  opts?: { viewerId?: string | null; excludeIds?: Set<string> }
): T[] {
  const exclude = opts?.excludeIds || new Set<string>();
  const seen = getTodaySeenIds();
  const seedBase = `${dayKey()}:${opts?.viewerId || "guest"}`;
  const rand = mulberry32(hashSeed(seedBase));

  const list = profiles.filter((p) => !exclude.has(p.id));

  const scored = list.map((p, i) => {
    const boostActive =
      p.boostUntil && new Date(p.boostUntil).getTime() > Date.now();
    const bucket =
      (boostActive ? 0 : 1) * 100 +
      (p.online ? 0 : 10) +
      (seen.has(p.id) ? 1 : 0);
    return { p, bucket, noise: rand(), idx: i };
  });

  scored.sort((a, b) => {
    if (a.bucket !== b.bucket) return a.bucket - b.bucket;
    if (a.noise !== b.noise) return a.noise - b.noise;
    return a.idx - b.idx;
  });

  return scored.map((s) => s.p);
}
