export type CallKind = "audio" | "video";
export type CallStatus =
  | "ringing"
  | "accepted"
  | "ended"
  | "missed"
  | "rejected";

export type CallRow = {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  kind: CallKind;
  status: CallStatus;
  livekit_room: string;
  created_at: string;
  ended_at: string | null;
};

export type CallSessionPayload = {
  call: CallRow;
  token: string | null;
  livekitUrl: string | null;
  livekitConfigured: boolean;
  role: "caller" | "callee";
};

export type ActiveCallInfo = {
  callId: string;
  roomName: string;
  token: string | null;
  livekitUrl: string | null;
  livekitConfigured: boolean;
  kind: CallKind;
  role: "caller" | "callee";
  status: CallStatus;
  peer: { id: string; name: string; photo: string };
};

export async function apiCreateCall(body: {
  conversationId: string;
  calleeId: string;
  kind: CallKind;
}): Promise<CallSessionPayload> {
  const res = await fetch("/api/calls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "无法发起通话");
  return data as CallSessionPayload;
}

export async function apiCallAction(
  callId: string,
  action: "accept" | "reject" | "end" | "miss"
): Promise<CallSessionPayload> {
  const res = await fetch(`/api/calls/${callId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "操作失败");
  return data as CallSessionPayload;
}
