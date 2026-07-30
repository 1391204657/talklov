import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  LIVEKIT_URL,
  isLiveKitConfigured,
} from "@/lib/livekit/config";
import {
  createParticipantToken,
  deleteLiveKitRoom,
} from "@/lib/livekit/token";

type Action = "accept" | "reject" | "end" | "miss";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: callId } = await ctx.params;
  const sb = await getSupabaseServer();
  if (!sb) {
    return NextResponse.json({ error: "后端未配置" }, { status: 503 });
  }

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let action: Action;
  try {
    const body = await req.json();
    action = body.action;
  } catch {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }

  if (!["accept", "reject", "end", "miss"].includes(action)) {
    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  }

  const { data: call, error } = await sb
    .from("calls")
    .select("*")
    .eq("id", callId)
    .maybeSingle();

  if (error || !call) {
    return NextResponse.json({ error: "通话不存在" }, { status: 404 });
  }

  const isCaller = call.caller_id === user.id;
  const isCallee = call.callee_id === user.id;
  if (!isCaller && !isCallee) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }

  const now = new Date().toISOString();

  if (action === "accept") {
    if (!isCallee) {
      return NextResponse.json({ error: "只有被叫方可接听" }, { status: 403 });
    }
    if (call.status !== "ringing") {
      return NextResponse.json(
        { error: "通话已结束或已接听" },
        { status: 409 }
      );
    }
    const { data: updated, error: upErr } = await sb
      .from("calls")
      .update({ status: "accepted" })
      .eq("id", callId)
      .eq("status", "ringing")
      .select("*")
      .single();
    if (upErr || !updated) {
      return NextResponse.json(
        { error: upErr?.message || "接听失败" },
        { status: 500 }
      );
    }
    const { data: profile } = await sb
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();
    const token = await createParticipantToken({
      roomName: updated.livekit_room,
      identity: user.id,
      name: (profile?.name as string) || user.id,
    });
    return NextResponse.json({
      call: updated,
      token,
      livekitUrl: isLiveKitConfigured ? LIVEKIT_URL : null,
      livekitConfigured: isLiveKitConfigured,
      role: "callee" as const,
    });
  }

  if (action === "reject") {
    if (!isCallee) {
      return NextResponse.json({ error: "只有被叫方可拒绝" }, { status: 403 });
    }
    const { data: updated, error: upErr } = await sb
      .from("calls")
      .update({ status: "rejected", ended_at: now })
      .eq("id", callId)
      .in("status", ["ringing"])
      .select("*")
      .single();
    if (upErr || !updated) {
      return NextResponse.json(
        { error: upErr?.message || "拒绝失败" },
        { status: 500 }
      );
    }
    await deleteLiveKitRoom(updated.livekit_room);
    return NextResponse.json({
      call: updated,
      token: null,
      livekitUrl: null,
      livekitConfigured: isLiveKitConfigured,
      role: "callee" as const,
    });
  }

  if (action === "miss") {
    const { data: updated, error: upErr } = await sb
      .from("calls")
      .update({ status: "missed", ended_at: now })
      .eq("id", callId)
      .eq("status", "ringing")
      .select("*")
      .maybeSingle();
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }
    if (updated) await deleteLiveKitRoom(updated.livekit_room);
    return NextResponse.json({
      call: updated || call,
      token: null,
      livekitUrl: null,
      livekitConfigured: isLiveKitConfigured,
      role: isCaller ? ("caller" as const) : ("callee" as const),
    });
  }

  // end
  if (!["ringing", "accepted"].includes(call.status)) {
    return NextResponse.json({
      call,
      token: null,
      livekitUrl: null,
      livekitConfigured: isLiveKitConfigured,
      role: isCaller ? ("caller" as const) : ("callee" as const),
    });
  }
  const nextStatus = call.status === "ringing" ? "missed" : "ended";
  const { data: updated, error: upErr } = await sb
    .from("calls")
    .update({ status: nextStatus, ended_at: now })
    .eq("id", callId)
    .select("*")
    .single();
  if (upErr || !updated) {
    return NextResponse.json(
      { error: upErr?.message || "挂断失败" },
      { status: 500 }
    );
  }
  await deleteLiveKitRoom(updated.livekit_room);
  return NextResponse.json({
    call: updated,
    token: null,
    livekitUrl: null,
    livekitConfigured: isLiveKitConfigured,
    role: isCaller ? ("caller" as const) : ("callee" as const),
  });
}
