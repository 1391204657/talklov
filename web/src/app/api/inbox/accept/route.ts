import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Recipient accepts an icebreaker. Uses the admin client so the opener can be
 * inserted as the original sender (browser RLS only allows sender_id = auth.uid()).
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

    let body: { icebreakerId?: string } = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const icebreakerId = (body.icebreakerId || "").trim();
    if (!icebreakerId) {
      return NextResponse.json({ error: "Missing icebreakerId" }, { status: 400 });
    }

    const { data: ib, error: ibErr } = await admin
      .from("icebreakers")
      .select("id,conversation_id,sender_id,recipient_id,text,status")
      .eq("id", icebreakerId)
      .maybeSingle();
    if (ibErr || !ib) {
      return NextResponse.json({ error: "Icebreaker not found" }, { status: 404 });
    }
    if (ib.recipient_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (ib.status === "declined") {
      return NextResponse.json({ error: "Already declined" }, { status: 409 });
    }

    if (ib.status !== "accepted") {
      const { error: upIb } = await admin
        .from("icebreakers")
        .update({ status: "accepted" })
        .eq("id", icebreakerId)
        .eq("recipient_id", user.id);
      if (upIb) {
        return NextResponse.json({ error: upIb.message }, { status: 500 });
      }
    }

    const { error: upConv } = await admin
      .from("conversations")
      .update({ status: "accepted" })
      .eq("id", ib.conversation_id);
    if (upConv) {
      return NextResponse.json({ error: upConv.message }, { status: 500 });
    }

    // Avoid duplicate opener if accept is retried.
    const { data: existing } = await admin
      .from("messages")
      .select("id")
      .eq("conversation_id", ib.conversation_id)
      .eq("sender_id", ib.sender_id)
      .eq("content", ib.text)
      .limit(1);
    if (!existing?.length) {
      const { error: msgErr } = await admin.from("messages").insert({
        conversation_id: ib.conversation_id,
        sender_id: ib.sender_id,
        kind: "text",
        content: ib.text,
      });
      if (msgErr) {
        return NextResponse.json({ error: msgErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      conversationId: ib.conversation_id,
      otherId: ib.sender_id,
    });
  } catch (e) {
    console.error("[api/inbox/accept]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "accept failed" },
      { status: 500 }
    );
  }
}
