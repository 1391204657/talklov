import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { createClient } from "@supabase/supabase-js";
import { mapPublicProfile, type PublicProfileRow } from "@/lib/profileMap";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SELECT_SAFE =
  "id,handle,name,age,gender,country,city,native_lang,learning_lang,level,intents,interests,bio,avatar_url,photos,occupation,education,zodiac,chinese_variant,photo_privacy,tier,verified,online,plan,plan_expires_at,is_founder,founder_slot,founder_last_active_at,boost_until,created_at,updated_at,banned_at";

/**
 * Same-origin public profile lookup (Vercel → Supabase).
 * Avoids CN browsers failing on direct *.supabase.co reads.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  if (!isSupabaseConfigured || !SUPABASE_URL) {
    return NextResponse.json({ profile: null, source: "unconfigured" });
  }

  const admin = getSupabaseAdmin();
  const sb =
    admin ||
    (SUPABASE_ANON_KEY
      ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null);

  if (!sb) {
    return NextResponse.json({ profile: null, source: "no-client" });
  }

  if (admin) {
    const { data, error } = await admin
      .from("profiles")
      .select(SELECT_SAFE)
      .eq("id", id)
      .maybeSingle();
    if (!error && data) {
      const row = data as PublicProfileRow & { banned_at?: string | null };
      if (row.banned_at) {
        return NextResponse.json({ profile: null, source: "banned" });
      }
      // Empty name → email local-part
      if (!(row.name || "").trim()) {
        try {
          const { data: u } = await admin.auth.admin.getUserById(id);
          const local = u.user?.email?.split("@")[0]?.trim();
          if (local) row.name = local;
        } catch {
          /* ignore */
        }
      }
      return NextResponse.json({
        profile: mapPublicProfile(row),
        source: "select-admin",
      });
    }
  }

  const rpc = await sb.rpc("get_profile_public", { p_id: id });
  if (!rpc.error && rpc.data) {
    const row = (
      Array.isArray(rpc.data) ? rpc.data[0] : rpc.data
    ) as PublicProfileRow | null;
    if (row?.id) {
      return NextResponse.json({
        profile: mapPublicProfile(row),
        source: admin ? "rpc-admin" : "rpc-anon",
      });
    }
  }

  return NextResponse.json({ profile: null, source: "not-found" }, { status: 404 });
}
