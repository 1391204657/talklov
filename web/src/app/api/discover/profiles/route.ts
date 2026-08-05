import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { mapPublicProfile, type PublicProfileRow } from "@/lib/profileMap";
import { isStaffOnlyEmail, staffOnlyEmails } from "@/lib/adminAuth";

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

/** Auth emails + staff-only user ids (ops accounts hidden from Discover). */
async function loadAuthIndex(admin: SupabaseClient): Promise<{
  emailById: Map<string, string>;
  staffIds: Set<string>;
}> {
  const emailById = new Map<string, string>();
  const staffIds = new Set<string>();
  const staff = new Set(staffOnlyEmails());
  try {
    let page = 1;
    for (;;) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) break;
      for (const u of data?.users || []) {
        if (u.email) {
          emailById.set(u.id, u.email);
          if (isStaffOnlyEmail(u.email) || staff.has(u.email.toLowerCase())) {
            staffIds.add(u.id);
          }
        }
      }
      if ((data?.users || []).length < 200) break;
      page += 1;
      if (page > 10) break;
    }
  } catch {
    /* ignore */
  }
  return { emailById, staffIds };
}

function enrichEmptyNames(
  rows: PublicProfileRow[],
  emailById: Map<string, string>
): PublicProfileRow[] {
  return rows.map((r) => {
    if ((r.name || "").trim()) return r;
    const email = emailById.get(r.id);
    const local = email?.split("@")[0]?.trim();
    if (!local) return r;
    return { ...r, name: local };
  });
}

function withoutStaff(
  rows: PublicProfileRow[],
  staffIds: Set<string>
): PublicProfileRow[] {
  if (!staffIds.size) {
    return rows.filter((r) => (r.name || "").trim().toLowerCase() !== "admin");
  }
  return rows.filter((r) => !staffIds.has(r.id));
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

  if (admin) {
    const sel = await admin
      .from("profiles")
      .select(SELECT_SAFE)
      .is("banned_at", null)
      .order("created_at", { ascending: false })
      .limit(200);

    if (!sel.error && Array.isArray(sel.data)) {
      const { emailById, staffIds } = await loadAuthIndex(admin);
      const visible = withoutStaff(sel.data as PublicProfileRow[], staffIds);
      const enriched = enrichEmptyNames(visible, emailById);
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

  const staffIds = admin
    ? (await loadAuthIndex(admin)).staffIds
    : new Set<string>();

  const rpc = await sb.rpc("list_profiles_public");
  if (!rpc.error && Array.isArray(rpc.data)) {
    const profiles = sortNewestFirst(
      withoutStaff(rpc.data as PublicProfileRow[], staffIds)
    )
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
    const rows = withoutStaff(
      (sel.data as PublicProfileRow[]).filter(
        (r) => !(r as { banned_at?: string | null }).banned_at
      ),
      staffIds
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
