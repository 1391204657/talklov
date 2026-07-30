import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import {
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
  LIVEKIT_URL,
  isLiveKitConfigured,
} from "./config";

export async function createParticipantToken(opts: {
  roomName: string;
  identity: string;
  name?: string;
  ttlSeconds?: number;
}): Promise<string | null> {
  if (!isLiveKitConfigured) return null;
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: opts.identity,
    name: opts.name || opts.identity,
    ttl: opts.ttlSeconds ?? 60 * 60,
  });
  at.addGrant({
    roomJoin: true,
    room: opts.roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return at.toJwt();
}

/** Best-effort room cleanup when a call ends. */
export async function deleteLiveKitRoom(roomName: string): Promise<void> {
  if (!isLiveKitConfigured || !LIVEKIT_URL) return;
  try {
    const httpUrl = LIVEKIT_URL.replace(/^wss:/, "https:").replace(
      /^ws:/,
      "http:"
    );
    const svc = new RoomServiceClient(
      httpUrl,
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET
    );
    await svc.deleteRoom(roomName);
  } catch {
    /* room may already be empty / gone */
  }
}
