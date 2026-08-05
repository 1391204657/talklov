"use client";

import { useEffect, useState } from "react";
import { Profile } from "./types";
import { profiles as mockProfiles, getProfile as getMockProfile } from "./mockData";
import { isSupabaseConfigured } from "./supabase/config";
import { fetchProfile, fetchProfiles } from "./db";
import { useApp } from "./store";
import type { MyProfile } from "./profile";

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
  // Real Auth users (including kept accounts) stay visible; only demos are client mocks.
  const others = myId ? db.filter((p) => p.id !== myId) : db;
  const mockIds = new Set(mockProfiles.map((m) => m.id));
  const realExtra = others.filter((p) => !mockIds.has(p.id));
  const feed = [...realExtra, ...mockProfiles];
  // Testing: show my uploaded profile in Discover (local data: photos included).
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

/** Mainland CN often stalls on Supabase — don't block Discover forever. */
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
 * Discover feed: real DB users + mock demos (so registering doesn't empty the list).
 * Own profile is excluded here — open 「预览我的主页」 instead.
 * Mocks show immediately; DB refresh is best-effort (important when Supabase is slow in CN).
 */
export function useProfiles(): { profiles: Profile[]; loading: boolean } {
  const { userId, myProfile, tier } = useApp();
  const [profiles, setProfiles] = useState<Profile[]>(() =>
    mergeDiscover([], userId, myProfile, tier === "verified", tier)
  );
  // Never block the UI on network when we already have demo cards to show.
  const [loading, setLoading] = useState(false);

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
        setProfiles(
          mergeDiscover(rows, userId, myProfile, tier === "verified", tier)
        );
      })
      .catch(() => {
        // Keep mocks already on screen (timeout / blocked / offline).
        if (!cancelled) {
          setProfiles(
            mergeDiscover([], userId, myProfile, tier === "verified", tier)
          );
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId, myProfile, tier]);

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

  const [profile, setProfile] = useState<Profile | null>(
    isMe
      ? myProfileToPreview(userId ?? "me", myProfile, tier === "verified")
      : isSupabaseConfigured
      ? null
      : getMockProfile(id) ?? null
  );
  const [loading, setLoading] = useState(
    isSupabaseConfigured && !isMe && isUuid(id)
  );

  useEffect(() => {
    if (isMe) {
      setProfile(
        myProfileToPreview(userId ?? "me", myProfile, tier === "verified")
      );
      setLoading(false);
      return;
    }
    if (!isSupabaseConfigured) {
      setProfile(getMockProfile(id) ?? null);
      setLoading(false);
      return;
    }
    if (!isUuid(id)) {
      setProfile(getMockProfile(id) ?? null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchProfile(id)
      .then((p) => {
        if (cancelled) return;
        setProfile(p ?? getMockProfile(id) ?? null);
      })
      .catch(() => {
        if (!cancelled) setProfile(getMockProfile(id) ?? null);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, isMe, userId, myProfile, tier]);

  return { profile, loading, isMe };
}
