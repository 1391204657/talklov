import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminServer";
import { writeAdminAudit } from "@/lib/adminAudit";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Full transcript for one conversation (admin). */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { admin, user, email } = gate.ctx;
  const { id: conversationId } = await ctx.params;

  if (!UUID_RE.test(conversationId)) {
    return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
  }

  const focusUserId = (req.nextUrl.searchParams.get("userId") || "").trim();

  const { data: convo, error: cErr } = await admin
    .from("conversations")
    .select(
      "id,initiator_id,recipient_id,status,created_at,last_message_at"
    )
    .eq("id", conversationId)
    .maybeSingle();

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }
  if (!convo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    focusUserId &&
    UUID_RE.test(focusUserId) &&
    focusUserId !== convo.initiator_id &&
    focusUserId !== convo.recipient_id
  ) {
    return NextResponse.json(
      { error: "User is not a participant" },
      { status: 400 }
    );
  }

  const participantIds = [
    convo.initiator_id as string,
    convo.recipient_id as string,
  ];
  const { data: profs } = await admin
    .from("profiles")
    .select("id,name,country,city")
    .in("id", participantIds);
  const nameById: Record<string, string> = {};
  for (const p of profs || []) {
    nameById[p.id as string] = (p.name as string) || "—";
  }

  const [{ data: icebreakers }, { data: messages, error: mErr }] =
    await Promise.all([
      admin
        .from("icebreakers")
        .select("id,sender_id,recipient_id,text,status,created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }),
      admin
        .from("messages")
        .select(
          "id,sender_id,kind,content,audio_url,duration_sec,translation,flagged,created_at"
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(500),
    ]);

  if (mErr) {
    return NextResponse.json({ error: mErr.message }, { status: 500 });
  }

  await writeAdminAudit(admin, {
    adminUserId: user.id,
    adminEmail: email,
    action: "view_chat_transcript",
    targetUserId: focusUserId || (convo.initiator_id as string),
    meta: {
      conversation_id: conversationId,
      message_count: (messages || []).length,
      icebreaker_count: (icebreakers || []).length,
    },
  });

  return NextResponse.json({
    conversation: {
      id: convo.id,
      status: convo.status,
      createdAt: convo.created_at,
      lastMessageAt: convo.last_message_at,
      initiatorId: convo.initiator_id,
      recipientId: convo.recipient_id,
      initiatorName: nameById[convo.initiator_id as string] || "—",
      recipientName: nameById[convo.recipient_id as string] || "—",
    },
    icebreakers: (icebreakers || []).map((ib) => ({
      id: ib.id,
      senderId: ib.sender_id,
      senderName: nameById[ib.sender_id as string] || "—",
      text: ib.text,
      status: ib.status,
      createdAt: ib.created_at,
    })),
    messages: (messages || []).map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: nameById[m.sender_id as string] || "—",
      kind: m.kind,
      content: m.content,
      audioUrl: m.audio_url,
      durationSec: m.duration_sec,
      translation: m.translation,
      flagged: m.flagged,
      createdAt: m.created_at,
    })),
  });
}
