import type { Profile } from "./types";

/** In-memory + sessionStorage so Discover/Messages → Chat survives full page loads. */
const cache = new Map<string, Profile>();
const SS_KEY = "talklov_profile_cache_v1";

function hydrateFromSession() {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, Profile>;
    for (const [id, p] of Object.entries(obj)) {
      if (p?.id) cache.set(id, p);
    }
  } catch {
    /* ignore */
  }
}

function persistToSession() {
  if (typeof window === "undefined") return;
  try {
    const obj: Record<string, Profile> = {};
    for (const [id, p] of cache) obj[id] = p;
    // Cap size — keep last ~40
    const ids = Object.keys(obj);
    if (ids.length > 40) {
      for (const id of ids.slice(0, ids.length - 40)) delete obj[id];
    }
    sessionStorage.setItem(SS_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

let hydrated = false;
function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  hydrateFromSession();
}

export function cacheDiscoverProfiles(list: Profile[]) {
  ensureHydrated();
  let changed = false;
  for (const p of list) {
    if (p?.id) {
      cache.set(p.id, p);
      changed = true;
    }
  }
  if (changed) persistToSession();
}

export function getCachedProfile(id: string): Profile | null {
  ensureHydrated();
  return cache.get(id) ?? null;
}
