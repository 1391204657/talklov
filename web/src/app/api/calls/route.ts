import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  LIVEKIT_URL,
  isLiveKitConfigured,
} from "@/lib/livekit/config";
import { createParticipantToken } from "@/lib/livekit/token";

type Body = {
  conversationId?: string;
  calleeId?: string;
  kind?: "audio" | "video";
};

export async function POST(req: NextRequest) {
  const sb = await getSupabaseServer();
  if (!sb) {
    return NextResponse.json(
      { error: "后端未配置" },
      { status: 503 }
    );
  }

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }

  const conversationId = body.conversationId?.trim();
  const calleeId = body.calleeId?.trim();
  const kind = body.kind === "video" ? "video" : "audio";

  if (!conversationId || !calleeId) {
    return NextResponse.json(
      { error: "缺少会话或对方信息" },
      { status: 400 }
    );
  }
  if (calleeId === user.id) {
    return NextResponse.json({ error: "不能呼叫自己" }, { status: 400 });
  }

  const { data: convo, error: convoErr } = await sb
    .from("conversations")
    .select("id,status,initiator_id,recipient_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (convoErr || !convo) {
    return NextResponse.json({ error: "会话不存在" }, { status: 404 });
  }
  if (convo.status !== "accepted") {
    return NextResponse.json(
      { error: "对方接受打招呼后才能通话" },
      { status: 403 }
    );
  }

  const participants = [convo.initiator_id, convo.recipient_id] as string[];
  if (!participants.includes(user.id) || !participants.includes(calleeId)) {
    return NextResponse.json({ error: "无权在此会话通话" }, { status: 403 });
  }

  // End any leftover ringing calls for this pair
  await sb
    .from("calls")
    .update({ status: "missed", ended_at: new Date().toISOString() })
    .eq("status", "ringing")
    .or(
      `and(caller_id.eq.${user.id},callee_id.eq.${calleeId}),and(caller_id.eq.${calleeId},callee_id.eq.${user.id})`
    );

  const roomName = `call_${conversationId.replace(/-/g, "").slice(0, 12)}_${Date.now().toString(36)}`;

  const { data: call, error: insertErr } = await sb
    .from("calls")
    .insert({
      conversation_id: conversationId,
      caller_id: user.id,
      callee_id: calleeId,
      kind,
      status: "ringing",
      livekit_room: roomName,
    })
    .select("*")
    .single();

  if (insertErr || !call) {
    const msg = insertErr?.message || "创建通话失败";
    // Table missing → migration not run
    if (/relation .*calls.* does not exist/i.test(msg) || insertErr?.code === "42P01") {
      return NextResponse.json(
        {
          error:
            "数据库尚未开通通话表，请在 Supabase 运行 migrate_calls.sql",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const { data: profile } = await sb
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  const token = await createParticipantToken({
    roomName,
    identity: user.id,
    name: (profile?.name as string) || user.id,
  });

  return NextResponse.json({
    call,
    token,
    livekitUrl: isLiveKitConfigured ? LIVEKIT_URL : null,
    livekitConfigured: isLiveKitConfigured,
    role: "caller" as const,
  });
}
