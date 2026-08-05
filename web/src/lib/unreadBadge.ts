/** Combines local demo unread + backend pending hello count for TabBar / app icon. */

import { totalUnread } from "./localInbox";

const PENDING_KEY = "talklov_backend_pending_v1";

function readPending(): number {
  if (typeof window === "undefined") return 0;
  try {
    const n = Number(localStorage.getItem(PENDING_KEY) || "0");
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function setBackendPendingCount(n: number) {
  if (typeof window === "undefined") return;
  const next = Math.max(0, Math.floor(n));
  try {
    localStorage.setItem(PENDING_KEY, String(next));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("talklov-inbox"));
}

export function backendPendingCount(): number {
  return readPending();
}

/** Red badge number for messages tab + home-screen icon. */
export function totalBadgeCount(): number {
  return totalUnread() + readPending();
}
