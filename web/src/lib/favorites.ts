"use client";

import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { fetchProfiles } from "@/lib/db";
import { profiles as mockProfiles, getProfile as getMockProfile } from "@/lib/mockData";
import { isUuid } from "@/lib/useProfiles";
import type { Profile } from "@/lib/types";

const LOCAL_KEY = "talklov_favorites_v1";

function readLocal(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeLocal(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify([...new Set(ids)]));
  } catch {}
}

function toggleLocal(targetId: string): boolean {
  const ids = readLocal();
  if (ids.includes(targetId)) {
    writeLocal(ids.filter((id) => id !== targetId));
    return false;
  }
  writeLocal([targetId, ...ids]);
  return true;
}

/** Demo / mock ids can't satisfy favorites.target_id → profiles FK. */
function isDbFavoriteTarget(targetId: string): boolean {
  return isUuid(targetId);
}

async function listDbFavoriteIds(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured) return [];
  const sb = getSupabaseBrowser();
  if (!sb) return [];
  const { data, error } = await sb
    .from("favorites")
    .select("target_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("[favorites] list", error.message);
    return [];
  }
  return (data || []).map((r) => r.target_id as string);
}

export async function listMyFavoriteIds(userId: string | null): Promise<string[]> {
  const local = readLocal();
  if (!userId || !isSupabaseConfigured) return local;
  const db = await listDbFavoriteIds(userId);
  // Local holds mock ids; DB holds real UUIDs — merge, DB-first for order of real ones
  const mockLocal = local.filter((id) => !isDbFavoriteTarget(id));
  const uuidLocal = local.filter((id) => isDbFavoriteTarget(id));
  // Prefer DB for UUIDs; keep local UUID only if not yet synced
  const merged = [...db, ...uuidLocal.filter((id) => !db.includes(id)), ...mockLocal];
  return [...new Set(merged)];
}

export async function isFavorited(
  userId: string | null,
  targetId: string
): Promise<boolean> {
  const ids = await listMyFavoriteIds(userId);
  return ids.includes(targetId);
}

export async function toggleFavorite(
  userId: string | null,
  targetId: string
): Promise<boolean> {
  if (!targetId || targetId === userId || targetId === "me") {
    throw new Error("invalid target");
  }

  // Mock / demo profiles: localStorage only (no FK in DB)
  if (!isDbFavoriteTarget(targetId)) {
    return toggleLocal(targetId);
  }

  // Guest or no supabase: local
  if (!userId || !isSupabaseConfigured) {
    return toggleLocal(targetId);
  }

  const sb = getSupabaseBrowser();
  if (!sb) return toggleLocal(targetId);

  const { data: existing, error: selErr } = await sb
    .from("favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("target_id", targetId)
    .maybeSingle();
  if (selErr) {
    console.warn("[favorites] select", selErr.message);
    // Fall back so UX still works
    return toggleLocal(targetId);
  }

  if (existing?.id) {
    const { error } = await sb.from("favorites").delete().eq("id", existing.id);
    if (error) throw new Error(error.message);
    writeLocal(readLocal().filter((id) => id !== targetId));
    return false;
  }

  const { error } = await sb.from("favorites").insert({
    user_id: userId,
    target_id: targetId,
  });
  if (error) {
    // FK / RLS — still save locally so the heart responds
    console.warn("[favorites] insert", error.message);
    return toggleLocal(targetId);
  }
  writeLocal([targetId, ...readLocal().filter((id) => id !== targetId)]);
  return true;
}

export async function fetchMyFavoriteProfiles(
  userId: string | null
): Promise<Profile[]> {
  const ids = await listMyFavoriteIds(userId);
  if (!ids.length) return [];

  const map = new Map<string, Profile>();
  for (const m of mockProfiles) map.set(m.id, m);

  if (isSupabaseConfigured) {
    try {
      const all = await fetchProfiles();
      for (const p of all) map.set(p.id, p);
    } catch {
      /* keep mocks */
    }
  }

  return ids
    .map((id) => map.get(id) || getMockProfile(id) || null)
    .filter(Boolean) as Profile[];
}

/** Who favorited me — VIP only in UI. Real users only (DB). */
export async function fetchWhoFavoritedMe(
  userId: string
): Promise<{ id: string; createdAt: string; profile: Profile | null }[]> {
  if (!isSupabaseConfigured) return [];
  const sb = getSupabaseBrowser();
  if (!sb) return [];

  const { data, error } = await sb
    .from("favorites")
    .select("user_id, created_at")
    .eq("target_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.warn("[favorites] who", error.message);
    return [];
  }

  const rows = data || [];
  if (!rows.length) return [];
  const all = await fetchProfiles().catch(() => [] as Profile[]);
  const map = new Map(all.map((p) => [p.id, p]));
  return rows.map((r) => ({
    id: r.user_id as string,
    createdAt: r.created_at as string,
    profile: map.get(r.user_id as string) || null,
  }));
}
