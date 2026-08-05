import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { SUPABASE_URL } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

type Body = {
  name?: string;
  gender?: string;
  age?: number | null;
  country?: string;
  city?: string;
  occupation?: string;
  education?: string;
  zodiac?: string;
  bio?: string;
  interests?: string[];
  photos?: string[];
  nativeLang?: string;
  learningLang?: string;
  level?: string;
  phoneE164?: string;
  chineseVariants?: string[];
  intents?: string[];
  photoPrivacy?: string;
};

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; contentType: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  const contentType = m[1] || "image/jpeg";
  const bin = Buffer.from(m[2], "base64");
  if (bin.length < 32 || bin.length > 5_000_000) return null;
  return { bytes: new Uint8Array(bin), contentType };
}

async function uploadDataUrl(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  userId: string,
  dataUrl: string,
  index: number
): Promise<string | null> {
  const parsed = dataUrlToBytes(dataUrl);
  if (!parsed) return null;
  const ext = parsed.contentType.includes("png")
    ? "png"
    : parsed.contentType.includes("webp")
      ? "webp"
      : "jpg";
  const path = `${userId}/${Date.now()}_${index}.${ext}`;
  const { error } = await admin.storage.from("avatars").upload(path, parsed.bytes, {
    contentType: parsed.contentType,
    upsert: true,
  });
  if (error) {
    console.warn("[api/profile/me] storage upload", error.message);
    return null;
  }
  const { data } = admin.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl || null;
}

/**
 * Same-origin profile save (Vercel → Supabase).
 * Mainland CN browsers often cannot upsert/upload to *.supabase.co directly.
 */
export async function POST(req: NextRequest) {
  const sb = await getSupabaseServer();
  if (!sb) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const writer = admin || sb;

  const remotePhotos: string[] = [];
  const incoming = Array.isArray(body.photos) ? body.photos.slice(0, 6) : [];
  for (let i = 0; i < incoming.length; i++) {
    const src = incoming[i];
    if (!src || typeof src !== "string") continue;
    if (src.startsWith("http://") || src.startsWith("https://")) {
      remotePhotos.push(src);
      continue;
    }
    if (src.startsWith("data:") && admin) {
      const url = await uploadDataUrl(admin, user.id, src, i);
      if (url) remotePhotos.push(url);
    }
  }

  const patch: Record<string, unknown> = {
    id: user.id,
    updated_at: new Date().toISOString(),
  };
  if (body.name !== undefined) patch.name = String(body.name).trim();
  if (body.gender !== undefined) patch.gender = body.gender;
  if (body.age !== undefined) patch.age = body.age;
  if (body.country !== undefined) patch.country = body.country;
  if (body.city !== undefined) patch.city = body.city;
  if (body.occupation !== undefined) patch.occupation = body.occupation;
  if (body.education !== undefined) patch.education = body.education;
  if (body.zodiac !== undefined) patch.zodiac = body.zodiac;
  if (body.bio !== undefined) patch.bio = body.bio;
  if (body.interests !== undefined) patch.interests = body.interests;
  if (body.nativeLang !== undefined) patch.native_lang = body.nativeLang;
  if (body.learningLang !== undefined) patch.learning_lang = body.learningLang;
  if (body.level !== undefined) patch.level = body.level;
  if (body.phoneE164 !== undefined) patch.phone_e164 = body.phoneE164 || null;
  if (body.chineseVariants !== undefined) {
    patch.chinese_variant = body.chineseVariants.length
      ? body.chineseVariants.join(",")
      : null;
  }
  if (body.intents !== undefined) patch.intents = body.intents;
  if (body.photoPrivacy !== undefined) patch.photo_privacy = body.photoPrivacy;
  if (incoming.length > 0) {
    // Only replace photos when client sent a gallery (may be empty after deletes).
    patch.photos = remotePhotos;
    patch.avatar_url = remotePhotos[0] ?? null;
  }

  const { error } = await writer.from("profiles").upsert(patch);
  if (error) {
    console.warn("[api/profile/me] upsert", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    id: user.id,
    photos: remotePhotos,
    storageConfigured: Boolean(admin && SUPABASE_URL),
  });
}
