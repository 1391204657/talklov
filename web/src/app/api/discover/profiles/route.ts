import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { mapPublicProfile, type PublicProfileRow } from "@/lib/profileMap";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SELECT_SAFE =
  "id,handle,name,age,gender,country,city,native_lang,learning_lang,level,intents,interests,bio,avatar_url,photos,occupation,education,zodiac,chinese_variant,photo_privacy,tier,verified,online,plan,plan_expires_at,is_founder,founder_slot,founder_last_active_at,boost_until,created_at,updated_at,banned_at";

function sortNewestFirst(rows: PublicProfileRow[]) {
  return [...rows].sort((a, b) => {
    const boostA =
      a.boost_until && new Date(a.boost_until).getTime() > Date.now() ? 1 : 0;
    const boostB =
      b.boost_until && new Date(b.boost_until).getTime() > Date.now() ? 1 : 0;
    if (boostA !== boostB) return boostB - boostA;
    const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
    const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (ca !== cb) return cb - ca;
    const oa = a.online ? 1 : 0;
    const ob = b.online ? 1 : 0;
    return ob - oa;
  });
}

/** When name is empty, show email local-part so new QQ users are recognizable. */
async function enrichEmptyNames(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  rows: PublicProfileRow[]
): Promise<PublicProfileRow[]> {
  const need = rows.filter((r) => !(r.name || "").trim());
  if (!need.length) return rows;
  const emailById = new Map<string, string>();
  // Prefer one listUsers pass for small user bases
  try {
    let page = 1;
    for (;;) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) break;
      for (const u of data?.users || []) {
        if (u.email) emailById.set(u.id, u.email);
      }
      if ((data?.users || []).length < 200) break;
      page += 1;
      if (page > 10) break;
    }
  } catch {
    /* ignore */
  }
  return rows.map((r) => {
    if ((r.name || "").trim()) return r;
    const email = emailById.get(r.id);
    const local = email?.split("@")[0]?.trim();
    if (!local) return r;
    return { ...r, name: local };
  });
}

/**
 * Discover feed via same-origin API.
 * Mainland CN clients often cannot reach supabase.co reliably;
 * they hit talklov.com → Vercel (US) → Supabase instead.
 */
export async function GET() {
  if (!isSupabaseConfigured || !SUPABASE_URL) {
    return NextResponse.json({ profiles: [], source: "unconfigured" });
  }

  const admin = getSupabaseAdmin();

  // Prefer admin direct select: full photos (no auth.uid photo gate), newest first.
  if (admin) {
    const sel = await admin
      .from("profiles")
      .select(SELECT_SAFE)
      .is("banned_at", null)
      .order("created_at", { ascending: false })
      .limit(200);

    if (!sel.error && Array.isArray(sel.data)) {
      const enriched = await enrichEmptyNames(
        admin,
        sel.data as PublicProfileRow[]
      );
      const profiles = sortNewestFirst(enriched)
        .map(mapPublicProfile)
        .filter((p) => p.id);
      return NextResponse.json({
        profiles,
        source: "select-admin",
      });
    }
    console.warn("[api/discover/profiles] admin select", sel.error?.message);
  }

  const sb =
    admin ||
    (SUPABASE_ANON_KEY
      ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null);

  if (!sb) {
    return NextResponse.json({ profiles: [], source: "no-client" });
  }

  const rpc = await sb.rpc("list_profiles_public");
  if (!rpc.error && Array.isArray(rpc.data)) {
    const profiles = sortNewestFirst(rpc.data as PublicProfileRow[])
      .map(mapPublicProfile)
      .filter((p) => p.id);
    return NextResponse.json({
      profiles,
      source: admin ? "rpc-admin" : "rpc-anon",
    });
  }

  const sel = await sb
    .from("profiles")
    .select(SELECT_SAFE)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!sel.error && Array.isArray(sel.data)) {
    const rows = (sel.data as PublicProfileRow[]).filter(
      (r) => !(r as { banned_at?: string | null }).banned_at
    );
    const profiles = sortNewestFirst(rows)
      .map(mapPublicProfile)
      .filter((p) => p.id);
    return NextResponse.json({
      profiles,
      source: admin ? "select-admin-fallback" : "select-anon",
    });
  }

  console.warn(
    "[api/discover/profiles]",
    rpc.error?.message || sel.error?.message
  );
  return NextResponse.json(
    {
      profiles: [],
      source: "error",
      error: rpc.error?.message || sel.error?.message || "fetch failed",
    },
    { status: 502 }
  );
}
