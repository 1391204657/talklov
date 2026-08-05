import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminServer";
import { isStaffOnlyEmail } from "@/lib/adminAuth";

const PROFILE_COLS =
  "id,name,handle,gender,age,country,city,plan,plan_expires_at,is_founder,founder_slot,verified,online,created_at,boost_until,referred_by_code,phone_e164,banned_at,ban_reason";

type ProfileRow = Record<string, unknown> & { id: string };

/**
 * Auth-first user list: every registered Auth account appears, even if profile
 * row is empty/missing (common when CN clients failed to upsert).
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { admin } = gate.ctx;

  const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
  const banned = (req.nextUrl.searchParams.get("banned") || "").trim();
  const limit = Math.min(
    200,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 100))
  );

  // 1) All Auth users
  const authUsers: { id: string; email: string | null; created_at?: string }[] =
    [];
  try {
    let page = 1;
    for (;;) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      for (const u of data?.users || []) {
        authUsers.push({
          id: u.id,
          email: u.email ?? null,
          created_at: u.created_at,
        });
      }
      if ((data?.users || []).length < 200) break;
      page += 1;
      if (page > 20) break;
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "listUsers failed" },
      { status: 500 }
    );
  }

  // 2) Profiles for those ids
  const ids = authUsers.map((u) => u.id);
  const profileById = new Map<string, ProfileRow>();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { data, error } = await admin
      .from("profiles")
      .select(PROFILE_COLS)
      .in("id", chunk);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    for (const row of data || []) {
      profileById.set(row.id as string, row as ProfileRow);
    }
  }

  // 3) Merge — Auth is source of truth for "is a registered user"
  let users = authUsers
    .filter((u) => !isStaffOnlyEmail(u.email))
    .map((u) => {
      const p = profileById.get(u.id);
      return {
        id: u.id,
        email: u.email,
        name: (p?.name as string | null) || null,
        handle: (p?.handle as string | null) || null,
        gender: (p?.gender as string | null) || null,
        age: (p?.age as number | null) ?? null,
        country: (p?.country as string | null) || null,
        city: (p?.city as string | null) || null,
        plan: (p?.plan as string | null) || "free",
        plan_expires_at: (p?.plan_expires_at as string | null) || null,
        is_founder: Boolean(p?.is_founder),
        founder_slot: (p?.founder_slot as number | null) ?? null,
        verified: Boolean(p?.verified),
        online: Boolean(p?.online),
        created_at:
          (p?.created_at as string | null) || u.created_at || null,
        boost_until: (p?.boost_until as string | null) || null,
        referred_by_code: (p?.referred_by_code as string | null) || null,
        phone_e164: (p?.phone_e164 as string | null) || null,
        banned_at: (p?.banned_at as string | null) || null,
        ban_reason: (p?.ban_reason as string | null) || null,
        has_profile: Boolean(p),
      };
    });

  if (banned === "1" || banned === "true") {
    users = users.filter((u) => u.banned_at);
  } else if (banned === "0" || banned === "false") {
    users = users.filter((u) => !u.banned_at);
  }

  if (q) {
    users = users.filter((u) => {
      const hay = [
        u.email,
        u.name,
        u.handle,
        u.city,
        u.phone_e164,
        u.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  users.sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });

  return NextResponse.json({
    users: users.slice(0, limit),
    total: users.length,
  });
}
