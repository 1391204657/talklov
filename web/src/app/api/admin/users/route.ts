import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminServer";
import { isStaffOnlyEmail } from "@/lib/adminAuth";

const PROFILE_COLS =
  "id,name,handle,gender,age,country,city,plan,plan_expires_at,is_founder,founder_slot,verified,online,created_at,boost_until,referred_by_code,phone_e164,banned_at,ban_reason";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { admin } = gate.ctx;

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const banned = (req.nextUrl.searchParams.get("banned") || "").trim();
  const limit = Math.min(
    100,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 40))
  );

  const qLower = q.toLowerCase();
  const looksEmail = q.includes("@");
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
  const looksPhone = /^\+?\d{6,}$/.test(q.replace(/[\s-]/g, ""));

  // Build email → id index (profiles table has no email column)
  const emailByIdAll = new Map<string, string>();
  const emailMatchIds: string[] = [];
  try {
    let page = 1;
    for (;;) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) break;
      for (const u of data?.users || []) {
        const em = (u.email || "").trim().toLowerCase();
        if (!em) continue;
        emailByIdAll.set(u.id, em);
        if (q && (em === qLower || em.includes(qLower))) {
          emailMatchIds.push(u.id);
        }
      }
      if ((data?.users || []).length < 200) break;
      page += 1;
      if (page > 10) break;
    }
  } catch {
    /* ignore */
  }

  let query = admin
    .from("profiles")
    .select(PROFILE_COLS)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (banned === "1" || banned === "true") {
    query = query.not("banned_at", "is", null);
  } else if (banned === "0" || banned === "false") {
    query = query.is("banned_at", null);
  }

  if (q) {
    if (isUuid) {
      query = query.eq("id", q);
    } else if (looksEmail) {
      if (!emailMatchIds.length) {
        return NextResponse.json({ users: [] });
      }
      query = query.in("id", emailMatchIds.slice(0, 100));
    } else if (looksPhone) {
      const digits = q.replace(/[\s-]/g, "");
      query = query.ilike("phone_e164", `%${digits}%`);
    } else {
      query = query.or(
        `name.ilike.%${q}%,handle.ilike.%${q}%,city.ilike.%${q}%`
      );
    }
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let rows = data || [];

  // If text search matched emails too, merge those profiles in
  if (q && !looksEmail && !isUuid && !looksPhone && emailMatchIds.length) {
    const have = new Set(rows.map((r) => r.id as string));
    const missing = emailMatchIds.filter((id) => !have.has(id)).slice(0, 40);
    if (missing.length) {
      const { data: extra } = await admin
        .from("profiles")
        .select(PROFILE_COLS)
        .in("id", missing);
      if (extra?.length) rows = [...extra, ...rows];
    }
  }

  const users = rows
    .map((r) => ({
      ...r,
      email: emailByIdAll.get(r.id as string) ?? null,
    }))
    .filter((u) => !isStaffOnlyEmail(u.email));

  return NextResponse.json({ users });
}
