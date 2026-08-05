import type { Profile } from "./types";

/** In-memory cache so Discover → Profile works even if CN can't hit Supabase. */
const cache = new Map<string, Profile>();

export function cacheDiscoverProfiles(list: Profile[]) {
  for (const p of list) {
    if (p?.id) cache.set(p.id, p);
  }
}

export function getCachedProfile(id: string): Profile | null {
  return cache.get(id) ?? null;
}
