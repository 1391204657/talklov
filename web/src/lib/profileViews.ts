"use client";

import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { fetchProfiles } from "@/lib/db";
import { isUuid } from "@/lib/useProfiles";
import type { Profile } from "@/lib/types";

/**
 * Record that viewer opened target's profile.
 * Only real UUID profiles (FK). Idempotent upsert on (viewer, target).
 */
export async function recordProfileView(
  viewerId: string | null,
  targetId: string
): Promise<void> {
  if (!viewerId || !targetId || viewerId === targetId) return;
  if (!isUuid(viewerId) || !isUuid(targetId)) return;
  if (!isSupabaseConfigured) return;
  const sb = getSupabaseBrowser();
  if (!sb) return;

  const now = new Date().toISOString();
  const { error } = await sb.from("profile_views").upsert(
    {
      viewer_id: viewerId,
      target_id: targetId,
      last_viewed_at: now,
    },
    { onConflict: "viewer_id,target_id" }
  );
  if (error) console.warn("[profile_views] upsert", error.message);
}

/** Count of distinct people who viewed me (safe for free teaser). */
export async function countWhoViewedMe(userId: string): Promise<number> {
  if (!isSupabaseConfigured || !isUuid(userId)) return 0;
  const sb = getSupabaseBrowser();
  if (!sb) return 0;
  const { count, error } = await sb
    .from("profile_views")
    .select("id", { count: "exact", head: true })
    .eq("target_id", userId);
  if (error) {
    console.warn("[profile_views] count", error.message);
    return 0;
  }
  return count ?? 0;
}

export type ProfileViewer = {
  id: string;
  lastViewedAt: string;
  profile: Profile | null;
};

/** Full list — VIP only in UI. */
export async function fetchWhoViewedMe(
  userId: string
): Promise<ProfileViewer[]> {
  if (!isSupabaseConfigured || !isUuid(userId)) return [];
  const sb = getSupabaseBrowser();
  if (!sb) return [];

  const { data, error } = await sb
    .from("profile_views")
    .select("viewer_id, last_viewed_at")
    .eq("target_id", userId)
    .order("last_viewed_at", { ascending: false })
    .limit(100);
  if (error) {
    console.warn("[profile_views] list", error.message);
    return [];
  }

  const rows = data || [];
  if (!rows.length) return [];
  const all = await fetchProfiles().catch(() => [] as Profile[]);
  const map = new Map(all.map((p) => [p.id, p]));
  return rows.map((r) => ({
    id: r.viewer_id as string,
    lastViewedAt: r.last_viewed_at as string,
    profile: map.get(r.viewer_id as string) || null,
  }));
}
