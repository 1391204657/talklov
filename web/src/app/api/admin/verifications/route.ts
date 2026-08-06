import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminServer";
import { writeAdminAudit } from "@/lib/adminAudit";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { admin } = gate.ctx;

  const status = (req.nextUrl.searchParams.get("status") || "pending").trim();
  const limit = Math.min(
    50,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 30))
  );

  let query = admin
    .from("verification_requests")
    .select(
      "id,user_id,selfie_data,status,admin_note,reviewed_by,reviewed_at,created_at,liveness_score,liveness_provider,liveness_session_id"
    )
    .order("created_at", { ascending: true })
    .limit(limit);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data || [];
  const ids = [...new Set(rows.map((r) => r.user_id as string))];
  const byId: Record<
    string,
    { name: string; photos: string[]; avatar_url: string | null; verified: boolean }
  > = {};

  if (ids.length) {
    const { data: profs } = await admin
      .from("profiles")
      .select("id,name,photos,avatar_url,verified")
      .in("id", ids);
    for (const p of profs || []) {
      byId[p.id as string] = {
        name: (p.name as string) || "—",
        photos: (p.photos as string[]) || [],
        avatar_url: (p.avatar_url as string) || null,
        verified: Boolean(p.verified),
      };
    }
  }

  return NextResponse.json({
    requests: rows.map((r) => {
      const u = byId[r.user_id as string];
      return {
        id: r.id,
        userId: r.user_id,
        userName: u?.name || "—",
        profilePhotos: u?.photos?.length
          ? u.photos
          : u?.avatar_url
            ? [u.avatar_url]
            : [],
        alreadyVerified: u?.verified || false,
        selfieData: r.selfie_data,
        status: r.status,
        adminNote: r.admin_note,
        reviewedAt: r.reviewed_at,
        createdAt: r.created_at,
        livenessScore: r.liveness_score,
        livenessProvider: r.liveness_provider,
      };
    }),
  });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { admin, user, email } = gate.ctx;

  let body: {
    id?: string;
    action?: "approve" | "reject";
    adminNote?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id || (body.action !== "approve" && body.action !== "reject")) {
    return NextResponse.json({ error: "Missing id/action" }, { status: 400 });
  }

  const note = body.adminNote?.trim() || null;
  if (body.action === "reject" && !note) {
    return NextResponse.json(
      { error: "Reject requires adminNote" },
      { status: 400 }
    );
  }

  const { data: row, error: fetchErr } = await admin
    .from("verification_requests")
    .select("id,user_id,status")
    .eq("id", body.id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (row.status !== "pending") {
    return NextResponse.json({ error: "Already reviewed" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const nextStatus = body.action === "approve" ? "approved" : "rejected";

  const { error: updErr } = await admin
    .from("verification_requests")
    .update({
      status: nextStatus,
      admin_note: note,
      reviewed_by: user.id,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", body.id)
    .eq("status", "pending");

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  if (body.action === "approve") {
    const { error: profileErr } = await admin
      .from("profiles")
      .update({
        verified: true,
        tier: "verified",
        updated_at: now,
      })
      .eq("id", row.user_id);
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }
  }

  await writeAdminAudit(admin, {
    adminUserId: user.id,
    adminEmail: email,
    action:
      body.action === "approve"
        ? "verification_approve"
        : "verification_reject",
    targetUserId: row.user_id as string,
    meta: { request_id: body.id, admin_note: note },
  });

  return NextResponse.json({ ok: true, status: nextStatus });
}
