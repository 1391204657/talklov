import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminServer";
import { writeAdminAudit } from "@/lib/adminAudit";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** List conversations involving this user (admin). */
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

  const { data: convos, error } = await admin
    .from("conversations")
    .select(
      "id,initiator_id,recipient_id,status,created_at,last_message_at"
    )
    .or(`initiator_id.eq.${id},recipient_id.eq.${id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(80);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = convos || [];
  const peerIds = [
    ...new Set(
      rows.map((c) =>
        c.initiator_id === id ? c.recipient_id : c.initiator_id
      ) as string[]
    ),
  ];

  const nameById: Record<string, string> = {};
  if (peerIds.length) {
    const { data: profs } = await admin
      .from("profiles")
      .select("id,name,country,city")
      .in("id", peerIds);
    for (const p of profs || []) {
      nameById[p.id as string] = (p.name as string) || "—";
    }
  }

  const chats = await Promise.all(
    rows.map(async (c) => {
      const peerId = (
        c.initiator_id === id ? c.recipient_id : c.initiator_id
      ) as string;
      const [{ count: msgCount }, { data: ib }] = await Promise.all([
        admin
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", c.id),
        admin
          .from("icebreakers")
          .select("text,status,created_at")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        id: c.id as string,
        status: c.status as string,
        createdAt: c.created_at as string,
        lastMessageAt: (c.last_message_at as string) || null,
        peerId,
        peerName: nameById[peerId] || peerId.slice(0, 8),
        role: c.initiator_id === id ? "initiator" : "recipient",
        messageCount: msgCount ?? 0,
        icebreakerPreview: (ib?.text as string) || null,
        icebreakerStatus: (ib?.status as string) || null,
      };
    })
  );

  await writeAdminAudit(admin, {
    adminUserId: user.id,
    adminEmail: email,
    action: "list_user_chats",
    targetUserId: id,
    meta: { count: chats.length },
  });

  return NextResponse.json({ chats });
}
