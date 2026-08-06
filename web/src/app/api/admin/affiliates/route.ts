import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminServer";
import { writeAdminAudit } from "@/lib/adminAudit";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { admin } = gate.ctx;

  const { data: affiliates, error } = await admin
    .from("affiliates")
    .select(
      "id,code,display_name,user_id,contact_email,first_bps,renew_bps,active,notes,created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = affiliates || [];
  const enriched = await Promise.all(
    rows.map(async (a) => {
      const [{ count: referred }, { data: commissions }] = await Promise.all([
        admin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("referred_by_code", a.code),
        admin
          .from("affiliate_commissions")
          .select("commission_cents,status,currency,created_at")
          .eq("affiliate_id", a.id)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      const list = commissions || [];
      let pendingCents = 0;
      let payableCents = 0;
      let paidCents = 0;
      for (const c of list) {
        const n = (c.commission_cents as number) || 0;
        if (c.status === "pending") pendingCents += n;
        else if (c.status === "payable") payableCents += n;
        else if (c.status === "paid") paidCents += n;
      }

      return {
        ...a,
        referredCount: referred ?? 0,
        commissionCount: list.length,
        pendingCents,
        payableCents,
        paidCents,
        recentCommissions: list.slice(0, 8),
      };
    })
  );

  return NextResponse.json({ affiliates: enriched });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { admin, user, email } = gate.ctx;

  let body: {
    code?: string;
    displayName?: string;
    contactEmail?: string;
    firstBps?: number;
    renewBps?: number;
    notes?: string;
    userId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = (body.code || "").trim().toLowerCase();
  const displayName = (body.displayName || "").trim();
  if (!/^[a-z0-9_-]{2,32}$/.test(code)) {
    return NextResponse.json(
      { error: "Invalid code (2–32: a-z, 0-9, _ -)" },
      { status: 400 }
    );
  }
  if (!displayName) {
    return NextResponse.json({ error: "Missing display name" }, { status: 400 });
  }

  const firstBps =
    typeof body.firstBps === "number" && body.firstBps >= 0
      ? Math.min(Math.floor(body.firstBps), 10000)
      : 2000;
  const renewBps =
    typeof body.renewBps === "number" && body.renewBps >= 0
      ? Math.min(Math.floor(body.renewBps), 10000)
      : 1000;

  const { data: row, error } = await admin
    .from("affiliates")
    .upsert(
      {
        code,
        display_name: displayName,
        contact_email: body.contactEmail?.trim() || null,
        user_id: body.userId?.trim() || null,
        first_bps: firstBps,
        renew_bps: renewBps,
        notes: body.notes?.trim() || null,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "code" }
    )
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAdminAudit(admin, {
    adminUserId: user.id,
    adminEmail: email,
    action: "affiliate_create",
    meta: {
      affiliate_id: row.id,
      code,
      display_name: displayName,
      first_bps: firstBps,
      renew_bps: renewBps,
    },
  });

  return NextResponse.json({ ok: true, id: row.id });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { admin, user, email } = gate.ctx;

  let body: {
    id?: string;
    active?: boolean;
    notes?: string;
    markPaid?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  if (body.markPaid) {
    const paidAt = new Date().toISOString();
    const { data: updated, error } = await admin
      .from("affiliate_commissions")
      .update({ status: "paid", paid_at: paidAt })
      .eq("affiliate_id", body.id)
      .in("status", ["pending", "payable"])
      .select("id");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await writeAdminAudit(admin, {
      adminUserId: user.id,
      adminEmail: email,
      action: "affiliate_mark_paid",
      meta: {
        affiliate_id: body.id,
        count: updated?.length ?? 0,
        paid_at: paidAt,
      },
    });

    return NextResponse.json({ ok: true, paidCount: updated?.length ?? 0 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.active === "boolean") patch.active = body.active;
  if (body.notes !== undefined) patch.notes = body.notes;

  const { error } = await admin
    .from("affiliates")
    .update(patch)
    .eq("id", body.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAdminAudit(admin, {
    adminUserId: user.id,
    adminEmail: email,
    action: "affiliate_update",
    meta: { affiliate_id: body.id, ...patch },
  });

  return NextResponse.json({ ok: true });
}
