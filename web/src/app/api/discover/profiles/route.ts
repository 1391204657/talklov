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
  "id,handle,name,age,gender,country,city,native_lang,learning_lang,level,intents,interests,bio,avatar_url,photos,occupation,education,zodiac,chinese_variant,photo_privacy,tier,verified,online,plan,plan_expires_at,is_founder,founder_slot,founder_last_active_at,boost_until,created_at,updated_at";

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

  // 1) Privacy-gate RPC (preferred when migration applied)
  const rpc = await sb.rpc("list_profiles_public");
  if (!rpc.error && Array.isArray(rpc.data)) {
    const profiles = (rpc.data as PublicProfileRow[])
      .map(mapPublicProfile)
      .filter((p) => p.id);
    return NextResponse.json({
      profiles,
      source: admin ? "rpc-admin" : "rpc-anon",
    });
  }

  // 2) Direct select (works if photo columns not revoked; admin bypasses revoke)
  const sel = await sb
    .from("profiles")
    .select(SELECT_SAFE)
    .order("online", { ascending: false })
    .limit(200);

  if (!sel.error && Array.isArray(sel.data)) {
    const profiles = (sel.data as PublicProfileRow[])
      .map(mapPublicProfile)
      .filter((p) => p.id);
    return NextResponse.json({
      profiles,
      source: admin ? "select-admin" : "select-anon",
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
