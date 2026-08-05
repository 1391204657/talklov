"use client";

import { useEffect, useState } from "react";
import { Profile } from "./types";
import { profiles as mockProfiles, getProfile as getMockProfile } from "./mockData";
import { isSupabaseConfigured } from "./supabase/config";
import { fetchProfile, fetchProfiles } from "./db";
import { useApp } from "./store";
import type { MyProfile } from "./profile";
import { cacheDiscoverProfiles, getCachedProfile } from "./profileCache";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}

/** Always keep mock demos in the feed; prepend my card when I have a profile photo. */
function mergeDiscover(
  db: Profile[],
  myId: string | null,
  mine?: MyProfile | null,
  verified = false,
  tier: "guest" | "light" | "verified" = "guest"
): Profile[] {
  const others = myId ? db.filter((p) => p.id !== myId) : db;
  const mockIds = new Set(mockProfiles.map((m) => m.id));
  const realExtra = others
    .filter((p) => !mockIds.has(p.id))
    .slice()
    .sort((a, b) => {
      const boostA =
        a.boostUntil && new Date(a.boostUntil).getTime() > Date.now() ? 1 : 0;
      const boostB =
        b.boostUntil && new Date(b.boostUntil).getTime() > Date.now() ? 1 : 0;
      if (boostA !== boostB) return boostB - boostA;
      const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return cb - ca;
    });
  const feed = [...realExtra, ...mockProfiles];
  const showMe =
    tier !== "guest" &&
    mine &&
    (Boolean(mine.photos?.[0]) || Boolean(mine.name?.trim()));
  if (showMe) {
    const id = myId || "me";
    const me = myProfileToPreview(id, mine, verified);
    return [me, ...feed.filter((p) => p.id !== id)];
  }
  return feed;
}

export function myProfileToPreview(
  id: string,
  mine: MyProfile,
  verified: boolean
): Profile {
  return {
    id,
    name: mine.name || "我",
    age: mine.age ?? 0,
    gender: mine.gender,
    country: mine.country === "CN" ? "CN" : "US",
    city: mine.city,
    photo: mine.photos[0] ?? "",
    photos: mine.photos.length ? mine.photos : undefined,
    nativeLang: mine.nativeLang,
    learningLang: mine.learningLang,
    level: mine.level || "",
    intents: mine.intents,
    interests: mine.interests,
    bio: mine.bio,
    verified,
    online: true,
    photoPrivacy: mine.photoPrivacy,
    chineseVariants: mine.chineseVariants,
    voiceIntroUrl: mine.voiceIntroUrl || undefined,
  };
}

const DISCOVER_FETCH_MS = 8000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      }
    );
  });
}

/**
 * Discover feed: real DB users + mock demos.
 * Mocks show immediately; DB refresh is best-effort.
 */
export function useProfiles(): { profiles: Profile[]; loading: boolean } {
  const { userId, myProfile, tier } = useApp();
  const [profiles, setProfiles] = useState<Profile[]>(() =>
    mergeDiscover([], userId, myProfile, tier === "verified", tier)
  );
  const [loading, setLoading] = useState(false);

  // Stabilize effect deps — full myProfile object identity caused refetch loops ("同步中…" forever).
  const mineKey = `${myProfile.name}|${myProfile.photos?.[0] ?? ""}|${myProfile.age ?? ""}`;

  useEffect(() => {
    setProfiles(
      mergeDiscover([], userId, myProfile, tier === "verified", tier)
    );
    if (!isSupabaseConfigured) return;

    let cancelled = false;
    setLoading(true);
    withTimeout(fetchProfiles(), DISCOVER_FETCH_MS)
      .then((rows) => {
        if (cancelled) return;
        cacheDiscoverProfiles(rows);
        setProfiles(
          mergeDiscover(rows, userId, myProfile, tier === "verified", tier)
        );
      })
      .catch(() => {
        if (!cancelled) {
          setProfiles(
            mergeDiscover([], userId, myProfile, tier === "verified", tier)
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mineKey stands in for myProfile
  }, [userId, mineKey, tier]);

  return { profiles, loading };
}

/** A single profile by id. Own id → live preview from local myProfile. */
export function useProfile(id: string): {
  profile: Profile | null;
  loading: boolean;
  isMe: boolean;
} {
  const { userId, myProfile, tier } = useApp();
  const isMe = Boolean(userId && id === userId) || id === "me";

  const [profile, setProfile] = useState<Profile | null>(() => {
    if (isMe) {
      return myProfileToPreview(userId ?? "me", myProfile, tier === "verified");
    }
    if (!isUuid(id)) return getMockProfile(id) ?? null;
    return getCachedProfile(id) ?? (isSupabaseConfigured ? null : null);
  });
  const [loading, setLoading] = useState(
    isSupabaseConfigured && !isMe && isUuid(id) && !getCachedProfile(id)
  );

  useEffect(() => {
    if (isMe) {
      setProfile(
        myProfileToPreview(userId ?? "me", myProfile, tier === "verified")
      );
      setLoading(false);
      return;
    }
    if (!isUuid(id)) {
      setProfile(getMockProfile(id) ?? null);
      setLoading(false);
      return;
    }

    const cached = getCachedProfile(id);
    if (cached) {
      setProfile(cached);
      setLoading(false);
    }

    if (!isSupabaseConfigured) {
      if (!cached) setProfile(getMockProfile(id) ?? null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    if (!cached) setLoading(true);
    const t = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 8000);

    fetchProfile(id)
      .then((p) => {
        if (cancelled) return;
        if (p) {
          cacheDiscoverProfiles([p]);
          setProfile(p);
        } else if (!cached) {
          setProfile(getMockProfile(id) ?? null);
        }
      })
      .catch(() => {
        if (!cancelled && !cached) setProfile(getMockProfile(id) ?? null);
      })
      .finally(() => {
        window.clearTimeout(t);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [id, isMe, userId, myProfile, tier]);

  return { profile, loading, isMe };
}
