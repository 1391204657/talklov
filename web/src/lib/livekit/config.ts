/**
 * LiveKit Cloud credentials.
 *
 * Vercel / .env.local:
 *   NEXT_PUBLIC_LIVEKIT_URL = wss://xxxx.livekit.cloud
 *   LIVEKIT_API_KEY         = APIxxxxxxxx
 *   LIVEKIT_API_SECRET      = secretxxxxxxxx
 *
 * Create a project at https://cloud.livekit.io
 */

export const LIVEKIT_URL =
  process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim().replace(/^['"]|['"]$/g, "") ||
  process.env.LIVEKIT_URL?.trim().replace(/^['"]|['"]$/g, "") ||
  "";

export const LIVEKIT_API_KEY =
  process.env.LIVEKIT_API_KEY?.trim().replace(/^['"]|['"]$/g, "") || "";

export const LIVEKIT_API_SECRET =
  process.env.LIVEKIT_API_SECRET?.trim().replace(/^['"]|['"]$/g, "") || "";

export const isLiveKitConfigured = Boolean(
  LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET
);

/** Client-safe: public URL present (tokens still require server secrets). */
export const isLiveKitPublicConfigured = Boolean(
  typeof process !== "undefined" &&
    (process.env.NEXT_PUBLIC_LIVEKIT_URL || "").trim()
);
