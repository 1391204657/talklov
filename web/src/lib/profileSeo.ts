import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { isStaffOnlyEmail } from "@/lib/adminAuth";
import { mapPublicProfile, type PublicProfileRow } from "@/lib/profileMap";
import {
  SITE_NAME,
  absoluteUrl,
  buildPageMetadata,
  noIndexMetadata,
} from "@/lib/seo";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ProfileSeoDto = {
  id: string;
  name: string;
  age: number | null;
  city: string;
  country: "CN" | "US";
  nativeLang: string;
  learningLang: string;
  bio: string;
  verified: boolean;
  /** Absolute or site-relative image only when photos are public to guests. */
  ogImage: string | null;
  path: string;
};

function truncate(s: string, max: number) {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function isProfileUuid(id: string) {
  return UUID_RE.test(id);
}

/** Public fields only — no email/phone/occupation. Respects photo privacy via RPC. */
export async function fetchPublicProfileForSeo(
  id: string
): Promise<ProfileSeoDto | null> {
  if (!UUID_RE.test(id) || !isSupabaseConfigured || !SUPABASE_URL) return null;

  const admin = getSupabaseAdmin();
  const sb =
    admin ||
    (SUPABASE_ANON_KEY
      ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null);
  if (!sb) return null;

  if (admin) {
    try {
      const { data: u } = await admin.auth.admin.getUserById(id);
      if (isStaffOnlyEmail(u.user?.email)) return null;
    } catch {
      /* ignore */
    }
    const { data: banned } = await admin
      .from("profiles")
      .select("banned_at")
      .eq("id", id)
      .maybeSingle();
    if (banned?.banned_at) return null;
  }

  const rpc = await sb.rpc("get_profile_public", { p_id: id });
  if (rpc.error || !rpc.data) return null;
  const row = (
    Array.isArray(rpc.data) ? rpc.data[0] : rpc.data
  ) as PublicProfileRow | null;
  if (!row?.id) return null;

  const mapped = mapPublicProfile(row);
  const name = (mapped.name || "").trim();
  if (!name || name === "用户") return null;

  const privacy = mapped.photoPrivacy || "public";
  const firstPhoto = mapped.photo || mapped.photos?.[0] || null;
  const canShowPhoto =
    privacy === "public" && !mapped.photosLocked && Boolean(firstPhoto);

  return {
    id: mapped.id,
    name,
    age: mapped.age > 0 ? mapped.age : null,
    city: mapped.city || "",
    country: mapped.country,
    nativeLang: mapped.nativeLang || "",
    learningLang: mapped.learningLang || "",
    bio: mapped.bio || "",
    verified: mapped.verified,
    ogImage: canShowPhoto ? firstPhoto : null,
    path: `/profile/${mapped.id}`,
  };
}

export function buildProfileMetadata(seo: ProfileSeoDto | null, id: string): Metadata {
  if (!seo) {
    return {
      ...noIndexMetadata,
      title: { absolute: `资料 · ${SITE_NAME}` },
      description: "TalkLov 用户资料。",
      alternates: { canonical: absoluteUrl(`/profile/${id}`) },
    };
  }

  const bits = [
    seo.name,
    seo.age ? `${seo.age}岁` : null,
    seo.city || (seo.country === "CN" ? "中国" : "美国"),
    seo.verified ? "已认证" : null,
  ].filter(Boolean);

  const langBit = [seo.nativeLang, seo.learningLang]
    .filter(Boolean)
    .join(" → ");
  const descParts = [
    langBit ? `母语 ${langBit}` : null,
    seo.bio ? truncate(seo.bio, 120) : null,
    "在 TalkLov 认识语伴与朋友。",
  ].filter(Boolean);

  const page = {
    title: `${bits.join(" · ")} · ${SITE_NAME}`,
    description: descParts.join(" "),
    path: seo.path,
  };

  const meta = buildPageMetadata(page);
  if (seo.ogImage) {
    const img = seo.ogImage.startsWith("http")
      ? seo.ogImage
      : absoluteUrl(seo.ogImage);
    return {
      ...meta,
      openGraph: {
        ...meta.openGraph,
        type: "profile",
        images: [{ url: img, alt: seo.name }],
      },
      twitter: {
        ...meta.twitter,
        images: [img],
      },
    };
  }
  return meta;
}

export function personProfileJsonLd(seo: ProfileSeoDto) {
  const url = absoluteUrl(seo.path);
  const person: Record<string, unknown> = {
    "@type": "Person",
    name: seo.name,
    url,
    description: truncate(
      [seo.bio, seo.nativeLang && `母语：${seo.nativeLang}`, seo.learningLang && `在学：${seo.learningLang}`]
        .filter(Boolean)
        .join(" · ") || `${seo.name} 的 TalkLov 资料`,
      200
    ),
  };
  if (seo.ogImage) {
    person.image = seo.ogImage.startsWith("http")
      ? seo.ogImage
      : absoluteUrl(seo.ogImage);
  }
  if (seo.city) {
    person.homeLocation = {
      "@type": "Place",
      name: seo.city,
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${seo.name} · ${SITE_NAME}`,
    url,
    mainEntity: person,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
  };
}
