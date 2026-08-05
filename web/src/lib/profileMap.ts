/** Shared DB profile → UI Profile mapping (safe for server + client). */

import type { Profile } from "./types";
import { parseChineseVariants } from "./profile";
import { isFounderFrozen } from "./entitlements";
import { proxiedMediaList, proxiedMediaUrl } from "./mediaProxy";

export type PublicProfileRow = {
  id: string;
  handle?: string | null;
  name?: string | null;
  age?: number | null;
  gender?: string | null;
  country?: string | null;
  city?: string | null;
  native_lang?: string | null;
  learning_lang?: string | null;
  level?: string | null;
  intents?: string[] | null;
  interests?: string[] | null;
  bio?: string | null;
  avatar_url?: string | null;
  photos?: string[] | null;
  photos_locked?: boolean | null;
  occupation?: string | null;
  education?: string | null;
  zodiac?: string | null;
  chinese_variant?: string | null;
  photo_privacy?: Profile["photoPrivacy"] | null;
  tier?: string | null;
  verified?: boolean | null;
  online?: boolean | null;
  plan?: string | null;
  is_founder?: boolean | null;
  founder_slot?: number | null;
  founder_last_active_at?: string | null;
  boost_until?: string | null;
  created_at?: string | null;
  banned_at?: string | null;
};

export function mapPublicProfile(r: PublicProfileRow): Profile {
  const locked = Boolean(r.photos_locked);
  const raw = r.photos?.length
    ? r.photos
    : r.avatar_url
      ? [r.avatar_url]
      : [];
  const photos = locked
    ? []
    : proxiedMediaList(raw.filter(Boolean) as string[]);
  return {
    id: r.id,
    name: r.name || "用户",
    age: r.age ?? 0,
    gender: (r.gender === "female" ? "female" : "male") as Profile["gender"],
    country: (r.country === "CN" ? "CN" : "US") as Profile["country"],
    city: r.city ?? "",
    photo: photos[0] ?? proxiedMediaUrl(r.avatar_url) ?? "",
    photos,
    nativeLang: r.native_lang ?? "",
    learningLang: r.learning_lang ?? "",
    level: r.level ?? "",
    intents: (r.intents ?? []) as Profile["intents"],
    interests: r.interests ?? [],
    bio: r.bio ?? "",
    verified: Boolean(r.verified),
    online: Boolean(r.online),
    photoPrivacy: r.photo_privacy ?? "public",
    photosLocked: locked,
    chineseVariants: parseChineseVariants(r.chinese_variant),
    plan: (r.plan as Profile["plan"]) || "free",
    isFounder: Boolean(r.is_founder),
    founderSlot: r.founder_slot ?? null,
    founderFrozen:
      Boolean(r.is_founder) && isFounderFrozen(r.founder_last_active_at),
    boostUntil: r.boost_until ?? null,
    createdAt: r.created_at ?? null,
  };
}
