import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * If an accepted conversation has no messages yet, seed the accepted icebreaker
 * as the first chat bubble (repairs older accepts blocked by RLS).
 */
export async function POST(req: NextRequest) {
  try {
    const sb = await getSupabaseServer();
    const admin = getSupabaseAdmin();
    if (!sb || !admin) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }

    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { conversationId?: string } = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const conversationId = (body.conversationId || "").trim();
    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
    }

    const { data: conv, error: convErr } = await admin
      .from("conversations")
      .select("id,status,initiator_id,recipient_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (convErr || !conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    if (user.id !== conv.initiator_id && user.id !== conv.recipient_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (conv.status !== "accepted") {
      return NextResponse.json({ ok: true, seeded: false });
    }

    const { count } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId);
    if ((count ?? 0) > 0) {
      return NextResponse.json({ ok: true, seeded: false });
    }

    const { data: ib } = await admin
      .from("icebreakers")
      .select("id,sender_id,text,status")
      .eq("conversation_id", conversationId)
      .eq("status", "accepted")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!ib?.text) {
      return NextResponse.json({ ok: true, seeded: false });
    }

    const { error: msgErr } = await admin.from("messages").insert({
      conversation_id: conversationId,
      sender_id: ib.sender_id,
      kind: "text",
      content: ib.text,
    });
    if (msgErr) {
      return NextResponse.json({ error: msgErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, seeded: true });
  } catch (e) {
    console.error("[api/inbox/ensure-opener]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ensure failed" },
      { status: 500 }
    );
  }
}
