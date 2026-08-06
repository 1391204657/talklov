"use client";

import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { UserMomentPost } from "@/lib/datingSim";
import {
  deleteUserMoment,
  loadUserMoments,
  updateUserMoment,
  USER_MOMENTS_KEY,
} from "@/lib/datingSim";

type DbMoment = {
  id: string;
  user_id: string;
  body: string;
  tag: string | null;
  media: { type: "image" | "video"; url: string; alt?: string }[] | null;
  duo_invite_id: string | null;
  likes_count: number;
  comments: { by: string; text: string }[] | null;
  corrections: { by: string; text: string }[] | null;
  created_at: string;
};

function timeLabel(iso: string): string {
  try {
    const t = new Date(iso).getTime();
    const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (mins < 1) return "刚刚";
    if (mins < 60) return `${mins} 分钟前`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} 小时前`;
    return new Date(iso).toLocaleDateString();
  } catch {
    return "";
  }
}

/** Prefer https URLs in DB; keep flag that local had images. */
function mediaForDb(
  media?: UserMomentPost["media"]
): { type: "image" | "video"; url: string; alt?: string }[] {
  if (!media?.length) return [];
  return media
    .filter((m) => m.url && !m.url.startsWith("data:"))
    .slice(0, 9);
}

export function dbToUserMoment(row: DbMoment): UserMomentPost {
  return {
    id: row.id,
    text: row.body || "",
    time: timeLabel(row.created_at),
    likes: row.likes_count ?? 0,
    comments: Array.isArray(row.comments) ? row.comments : [],
    corrections: Array.isArray(row.corrections) ? row.corrections : [],
    tag: row.tag || undefined,
    duoInviteId: row.duo_invite_id || undefined,
    media: Array.isArray(row.media) ? row.media : [],
  };
}

/** Merge DB + local: local media wins when same id; local-only um-* kept. */
export function mergeMoments(
  db: UserMomentPost[],
  local: UserMomentPost[]
): UserMomentPost[] {
  const map = new Map<string, UserMomentPost>();
  for (const p of db) map.set(p.id, p);
  for (const p of local) {
    const prev = map.get(p.id);
    if (!prev) {
      map.set(p.id, p);
      continue;
    }
    map.set(p.id, {
      ...prev,
      ...p,
      media: p.media?.length ? p.media : prev.media,
      comments: p.comments.length ? p.comments : prev.comments,
      corrections: p.corrections.length ? p.corrections : prev.corrections,
      likes: Math.max(p.likes, prev.likes),
    });
  }
  return [...map.values()].sort((a, b) => {
    // Prefer fresher by id timestamp when um-, else keep DB order via created labels — stable: local list order first
    return 0;
  });
}

/** Ordered: local-first order for um, then by appearing in db list. */
export function mergeMomentsOrdered(
  db: UserMomentPost[],
  local: UserMomentPost[]
): UserMomentPost[] {
  const byId = new Map<string, UserMomentPost>();
  for (const p of db) byId.set(p.id, p);
  for (const p of local) {
    const prev = byId.get(p.id);
    byId.set(
      p.id,
      prev
        ? {
            ...prev,
            media: p.media?.length ? p.media : prev.media,
            text: p.text || prev.text,
            tag: p.tag ?? prev.tag,
            comments: p.comments.length >= prev.comments.length ? p.comments : prev.comments,
            corrections:
              p.corrections.length >= prev.corrections.length
                ? p.corrections
                : prev.corrections,
            likes: Math.max(p.likes, prev.likes),
            liked: p.liked ?? prev.liked,
          }
        : p
    );
  }
  const localIds = new Set(local.map((p) => p.id));
  const dbOnly = db.filter((p) => !localIds.has(p.id)).map((p) => byId.get(p.id)!);
  const localMerged = local.map((p) => byId.get(p.id)!);
  return [...localMerged, ...dbOnly];
}

export async function fetchMyMomentsFromDb(
  userId: string
): Promise<UserMomentPost[]> {
  if (!isSupabaseConfigured || !userId) return [];
  const sb = getSupabaseBrowser();
  if (!sb) return [];
  const { data, error } = await sb
    .from("moments")
    .select(
      "id,user_id,body,tag,media,duo_invite_id,likes_count,comments,corrections,created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.warn("[moments] fetch mine", error.message);
    return [];
  }
  return (data as DbMoment[] | null)?.map(dbToUserMoment) ?? [];
}

export async function fetchRecentMomentsFromDb(
  limit = 40
): Promise<(UserMomentPost & { userId: string })[]> {
  if (!isSupabaseConfigured) return [];
  const sb = getSupabaseBrowser();
  if (!sb) return [];
  const { data, error } = await sb
    .from("moments")
    .select(
      "id,user_id,body,tag,media,duo_invite_id,likes_count,comments,corrections,created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("[moments] fetch feed", error.message);
    return [];
  }
  return (
    (data as DbMoment[] | null)?.map((r) => ({
      ...dbToUserMoment(r),
      userId: r.user_id,
    })) ?? []
  );
}

export async function insertMomentToDb(
  userId: string,
  post: Omit<UserMomentPost, "id"> & { id?: string }
): Promise<UserMomentPost | null> {
  if (!isSupabaseConfigured || !userId) return null;
  const sb = getSupabaseBrowser();
  if (!sb) return null;

  const payload: Record<string, unknown> = {
    user_id: userId,
    body: post.text || "",
    tag: post.tag || null,
    media: mediaForDb(post.media),
    duo_invite_id: post.duoInviteId || null,
    likes_count: post.likes || 0,
    comments: post.comments || [],
    corrections: post.corrections || [],
  };
  // Keep client um-* id only if uuid; otherwise let DB generate
  const looksUuid =
    !!post.id &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      post.id
    );
  if (looksUuid) payload.id = post.id;

  const { data, error } = await sb
    .from("moments")
    .insert(payload)
    .select(
      "id,user_id,body,tag,media,duo_invite_id,likes_count,comments,corrections,created_at"
    )
    .single();

  if (error) {
    console.warn("[moments] insert", error.message);
    return null;
  }
  const row = dbToUserMoment(data as DbMoment);
  // Preserve local data: images
  return {
    ...row,
    media: post.media?.length ? post.media : row.media,
  };
}

export async function syncMomentInteractionsToDb(
  id: string,
  patch: Pick<UserMomentPost, "likes" | "comments" | "corrections">
): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id
    )
  ) {
    return;
  }
  const sb = getSupabaseBrowser();
  if (!sb) return;
  const { error } = await sb
    .from("moments")
    .update({
      likes_count: patch.likes,
      comments: patch.comments,
      corrections: patch.corrections,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) console.warn("[moments] sync interactions", error.message);
}

export async function deleteMomentFromDb(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id
    )
  ) {
    return;
  }
  const sb = getSupabaseBrowser();
  if (!sb) return;
  const { error } = await sb.from("moments").delete().eq("id", id);
  if (error) console.warn("[moments] delete", error.message);
}

/** Publish: local cache + DB when logged in. Returns final post (DB id if synced). */
export async function publishUserMoment(
  userId: string | null,
  post: UserMomentPost
): Promise<UserMomentPost> {
  let final = post;
  if (userId) {
    const remote = await insertMomentToDb(userId, post);
    if (remote) final = remote;
  }
  const list = loadUserMoments().filter(
    (p) => p.id !== post.id && p.id !== final.id
  );
  localStorage.setItem(
    USER_MOMENTS_KEY,
    JSON.stringify([final, ...list].slice(0, 30))
  );
  return final;
}

export async function removeUserMomentEverywhere(id: string): Promise<void> {
  deleteUserMoment(id);
  await deleteMomentFromDb(id);
}

export async function persistMomentInteraction(
  id: string,
  patch: Partial<
    Pick<UserMomentPost, "likes" | "liked" | "comments" | "corrections">
  >
): Promise<void> {
  updateUserMoment(id, patch);
  if (
    patch.likes !== undefined ||
    patch.comments !== undefined ||
    patch.corrections !== undefined
  ) {
    const cur = loadUserMoments().find((p) => p.id === id);
    if (cur) {
      await syncMomentInteractionsToDb(id, {
        likes: patch.likes ?? cur.likes,
        comments: patch.comments ?? cur.comments,
        corrections: patch.corrections ?? cur.corrections,
      });
    }
  }
}

/** Push offline um-* posts to cloud once (idempotent enough for MVP). */
export async function migrateLocalMomentsToCloud(
  userId: string
): Promise<void> {
  if (!userId || !isSupabaseConfigured) return;
  const local = loadUserMoments().filter((p) => p.id.startsWith("um-"));
  for (const p of local) {
    await publishUserMoment(userId, p);
  }
}
