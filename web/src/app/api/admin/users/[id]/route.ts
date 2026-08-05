import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminServer";
import { writeAdminAudit } from "@/lib/adminAudit";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Action =
  | "grant_vip_30"
  | "grant_vip_90"
  | "clear_vip"
  | "grant_founder"
  | "set_verified"
  | "clear_verified"
  | "ban"
  | "unban"
  | "delete";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { admin, user, email } = gate.ctx;
  const { id } = await ctx.params;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const { data: profile, error } = await admin
    .from("profiles")
    .select(
      "id,name,handle,gender,age,country,city,plan,plan_expires_at,is_founder,founder_slot,verified,online,created_at,boost_until,referred_by_code,phone_e164,bio,native_lang,learning_lang,level,intents,interests,photo_privacy,tier,banned_at,ban_reason,avatar_url,photos"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let authEmail: string | null = null;
  let authPhone: string | null = null;
  try {
    const { data: u } = await admin.auth.admin.getUserById(id);
    authEmail = u.user?.email ?? null;
    authPhone = u.user?.phone ?? null;
  } catch {
    /* ignore */
  }

  const [
    favoritesOut,
    favoritesIn,
    viewsOut,
    viewsIn,
    icebreakersSent,
    icebreakersRecv,
    convosAsInit,
    convosAsRecv,
    purchases,
  ] = await Promise.all([
    admin
      .from("favorites")
      .select("id", { count: "exact", head: true })
      .eq("user_id", id),
    admin
      .from("favorites")
      .select("id", { count: "exact", head: true })
      .eq("target_id", id),
    admin
      .from("profile_views")
      .select("id", { count: "exact", head: true })
      .eq("viewer_id", id),
    admin
      .from("profile_views")
      .select("id", { count: "exact", head: true })
      .eq("target_id", id),
    admin
      .from("icebreakers")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", id),
    admin
      .from("icebreakers")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", id),
    admin
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("initiator_id", id),
    admin
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", id),
    admin
      .from("purchases")
      .select("id", { count: "exact", head: true })
      .eq("user_id", id),
  ]);

  const { data: momentRows, error: momentsErr } = await admin
    .from("moments")
    .select(
      "id,body,tag,media,likes_count,comments,corrections,duo_invite_id,created_at"
    )
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(40);

  if (momentsErr) {
    console.warn("[admin user moments]", momentsErr.message);
  }

  await writeAdminAudit(admin, {
    adminUserId: user.id,
    adminEmail: email,
    action: "view_user_detail",
    targetUserId: id,
    meta: { includes_phone: true },
  });

  return NextResponse.json({
    user: {
      ...profile,
      email: authEmail,
      authPhone,
      phone_e164: profile.phone_e164 ?? authPhone,
    },
    behavior: {
      favoritesOut: favoritesOut.count ?? 0,
      favoritesIn: favoritesIn.count ?? 0,
      viewsOut: viewsOut.count ?? 0,
      viewsIn: viewsIn.count ?? 0,
      icebreakersSent: icebreakersSent.count ?? 0,
      icebreakersRecv: icebreakersRecv.count ?? 0,
      conversations:
        (convosAsInit.count ?? 0) + (convosAsRecv.count ?? 0),
      purchases: purchases.count ?? 0,
      moments: momentRows?.length ?? 0,
    },
    moments: (momentRows || []).map((m) => ({
      id: m.id,
      body: m.body,
      tag: m.tag,
      media: m.media,
      likesCount: m.likes_count,
      comments: m.comments,
      corrections: m.corrections,
      createdAt: m.created_at,
    })),
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { admin, user, email } = gate.ctx;
  const { id } = await ctx.params;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  let body: { action?: Action; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action;
  if (!action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  // Never soft-ban / delete the signed-in admin account via UI mistake
  if ((action === "ban" || action === "delete") && id === user.id) {
    return NextResponse.json(
      {
        error:
          action === "delete"
            ? "Cannot delete your own admin account"
            : "Cannot ban your own admin account",
      },
      { status: 400 }
    );
  }

  try {
    switch (action) {
      case "grant_vip_30":
      case "grant_vip_90": {
        const { data: row } = await admin
          .from("profiles")
          .select("is_founder,plan")
          .eq("id", id)
          .maybeSingle();
        if (row?.is_founder || row?.plan === "founder") {
          return NextResponse.json({
            ok: true,
            skipped: true,
            message: "User is Founder — VIP grant skipped",
          });
        }
        const days = action === "grant_vip_30" ? 30 : 90;
        const expires = new Date(
          Date.now() + days * 24 * 60 * 60 * 1000
        ).toISOString();
        const { error } = await admin
          .from("profiles")
          .update({ plan: "vip", plan_expires_at: expires })
          .eq("id", id);
        if (error) throw error;
        await writeAdminAudit(admin, {
          adminUserId: user.id,
          adminEmail: email,
          action,
          targetUserId: id,
          meta: { plan_expires_at: expires },
        });
        return NextResponse.json({
          ok: true,
          plan: "vip",
          plan_expires_at: expires,
        });
      }
      case "clear_vip": {
        const { data: row } = await admin
          .from("profiles")
          .select("is_founder")
          .eq("id", id)
          .maybeSingle();
        if (row?.is_founder) {
          return NextResponse.json(
            { error: "Cannot clear Founder via clear_vip" },
            { status: 400 }
          );
        }
        const { error } = await admin
          .from("profiles")
          .update({ plan: "free", plan_expires_at: null })
          .eq("id", id);
        if (error) throw error;
        await writeAdminAudit(admin, {
          adminUserId: user.id,
          adminEmail: email,
          action,
          targetUserId: id,
        });
        return NextResponse.json({ ok: true, plan: "free" });
      }
      case "grant_founder": {
        const { data, error } = await admin.rpc("grant_founder", {
          p_user_id: id,
        });
        if (error) throw error;
        await writeAdminAudit(admin, {
          adminUserId: user.id,
          adminEmail: email,
          action,
          targetUserId: id,
          meta: { founder_slot: data },
        });
        return NextResponse.json({ ok: true, founder_slot: data });
      }
      case "set_verified": {
        const { error } = await admin
          .from("profiles")
          .update({ verified: true, tier: "verified" })
          .eq("id", id);
        if (error) throw error;
        await writeAdminAudit(admin, {
          adminUserId: user.id,
          adminEmail: email,
          action,
          targetUserId: id,
        });
        return NextResponse.json({ ok: true, verified: true });
      }
      case "clear_verified": {
        const { error } = await admin
          .from("profiles")
          .update({ verified: false, tier: "light" })
          .eq("id", id);
        if (error) throw error;
        await writeAdminAudit(admin, {
          adminUserId: user.id,
          adminEmail: email,
          action,
          targetUserId: id,
        });
        return NextResponse.json({ ok: true, verified: false });
      }
      case "ban": {
        const reason = (body.reason || "").trim() || "Policy violation";
        const { error } = await admin
          .from("profiles")
          .update({
            banned_at: new Date().toISOString(),
            ban_reason: reason,
            banned_by: user.id,
          })
          .eq("id", id);
        if (error) throw error;
        await writeAdminAudit(admin, {
          adminUserId: user.id,
          adminEmail: email,
          action,
          targetUserId: id,
          meta: { reason },
        });
        return NextResponse.json({ ok: true, banned: true, reason });
      }
      case "unban": {
        const { error } = await admin
          .from("profiles")
          .update({
            banned_at: null,
            ban_reason: null,
            banned_by: null,
          })
          .eq("id", id);
        if (error) throw error;
        await writeAdminAudit(admin, {
          adminUserId: user.id,
          adminEmail: email,
          action,
          targetUserId: id,
        });
        return NextResponse.json({ ok: true, banned: false });
      }
      case "delete": {
        // Auth delete cascades profiles (FK on delete cascade) → gone from Discover.
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) throw error;
        await writeAdminAudit(admin, {
          adminUserId: user.id,
          adminEmail: email,
          action,
          targetUserId: id,
        });
        return NextResponse.json({ ok: true, deleted: true });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Action failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
