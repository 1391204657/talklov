import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminServer";
import { writeAdminAudit } from "@/lib/adminAudit";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { admin } = gate.ctx;

  const status = (req.nextUrl.searchParams.get("status") || "open").trim();
  const limit = Math.min(
    100,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 50))
  );

  let query = admin
    .from("reports")
    .select(
      "id,reporter_id,target_id,conversation_id,reason,details,status,admin_note,created_at,resolved_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data || [];
  const ids = [
    ...new Set(
      rows.flatMap((r) => [r.reporter_id as string, r.target_id as string])
    ),
  ];
  const nameById: Record<string, string> = {};
  if (ids.length) {
    const { data: profs } = await admin
      .from("profiles")
      .select("id,name")
      .in("id", ids);
    for (const p of profs || []) {
      nameById[p.id as string] = (p.name as string) || "—";
    }
  }

  return NextResponse.json({
    reports: rows.map((r) => ({
      ...r,
      reporterName: nameById[r.reporter_id as string] || "—",
      targetName: nameById[r.target_id as string] || "—",
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { admin, user, email } = gate.ctx;

  let body: {
    id?: string;
    status?: "open" | "reviewing" | "resolved" | "dismissed";
    adminNote?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id || !body.status) {
    return NextResponse.json({ error: "Missing id/status" }, { status: 400 });
  }

  if (
    (body.status === "resolved" || body.status === "dismissed") &&
    !body.adminNote?.trim()
  ) {
    return NextResponse.json(
      { error: "adminNote required for resolve/dismiss" },
      { status: 400 }
    );
  }

  const patch: Record<string, unknown> = {
    status: body.status,
    admin_note: body.adminNote?.trim() || null,
  };
  if (body.status === "resolved" || body.status === "dismissed") {
    patch.resolved_at = new Date().toISOString();
    patch.resolved_by = user.id;
  }

  const { error } = await admin.from("reports").update(patch).eq("id", body.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAdminAudit(admin, {
    adminUserId: user.id,
    adminEmail: email,
    action: `report_${body.status}`,
    meta: { report_id: body.id, admin_note: body.adminNote || null },
  });

  return NextResponse.json({ ok: true });
}
