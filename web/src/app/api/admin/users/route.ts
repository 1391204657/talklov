import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminServer";

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

  let query = admin
    .from("profiles")
    .select(
      "id,name,handle,gender,age,country,city,plan,plan_expires_at,is_founder,founder_slot,verified,online,created_at,boost_until,referred_by_code,phone_e164,banned_at,ban_reason"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (banned === "1" || banned === "true") {
    query = query.not("banned_at", "is", null);
  } else if (banned === "0" || banned === "false") {
    query = query.is("banned_at", null);
  }

  if (q) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
    if (isUuid) {
      query = query.eq("id", q);
    } else if (/^\+?\d{6,}$/.test(q.replace(/[\s-]/g, ""))) {
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

  const ids = (data || []).map((r) => r.id as string);
  const emailById: Record<string, string | null> = {};
  await Promise.all(
    ids.map(async (id) => {
      try {
        const { data: u } = await admin.auth.admin.getUserById(id);
        emailById[id] = u.user?.email ?? null;
      } catch {
        emailById[id] = null;
      }
    })
  );

  return NextResponse.json({
    users: (data || []).map((r) => ({
      ...r,
      email: emailById[r.id as string] ?? null,
    })),
  });
}
