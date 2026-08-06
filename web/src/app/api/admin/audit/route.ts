import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminServer";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { admin } = gate.ctx;

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const action = (req.nextUrl.searchParams.get("action") || "").trim();
  const limit = Math.min(
    200,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 80))
  );

  let query = admin
    .from("admin_audit_log")
    .select(
      "id,admin_user_id,admin_email,action,target_user_id,meta,created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (action) {
    query = query.eq("action", action);
  }
  if (q) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
    if (isUuid) {
      query = query.or(`target_user_id.eq.${q},admin_user_id.eq.${q}`);
    } else {
      query = query.or(`admin_email.ilike.%${q}%,action.ilike.%${q}%`);
    }
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data || [];
  const targetIds = [
    ...new Set(
      rows
        .map((r) => r.target_user_id as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const nameById: Record<string, string> = {};
  if (targetIds.length) {
    const { data: profs } = await admin
      .from("profiles")
      .select("id,name")
      .in("id", targetIds);
    for (const p of profs || []) {
      nameById[p.id as string] = (p.name as string) || "—";
    }
  }

  return NextResponse.json({
    logs: rows.map((r) => ({
      ...r,
      targetName: r.target_user_id
        ? nameById[r.target_user_id as string] || null
        : null,
    })),
  });
}
