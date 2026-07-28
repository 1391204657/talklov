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

/** Always keep mock demos in the feed; append DB users (except me). */
function mergeDiscover(db: Profile[], myId: string | null): Profile[] {
  const others = myId ? db.filter((p) => p.id !== myId) : db;
  // Prefer real users first, then mock scenery so Discover never collapses to 1 card.
  const mockIds = new Set(mockProfiles.map((m) => m.id));
  const realExtra = others.filter((p) => !mockIds.has(p.id));
  return [...realExtra, ...mockProfiles];
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
  };
}

/**
 * Discover feed: real DB users + mock demos (so registering doesn't empty the list).
 * Own profile is excluded here — open 「预览我的主页」 instead.
 */
export function useProfiles(): { profiles: Profile[]; loading: boolean } {
  const { userId } = useApp();
  const [profiles, setProfiles] = useState<Profile[]>(mockProfiles);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setProfiles(mockProfiles);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchProfiles()
      .then((rows) => {
        if (cancelled) return;
        setProfiles(mergeDiscover(rows, userId));
      })
      .catch(() => {
        if (!cancelled) setProfiles(mockProfiles);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId]);

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
