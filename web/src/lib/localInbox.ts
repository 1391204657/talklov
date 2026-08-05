/** Local demo inbox for AI partners (mei / jack) — survives refresh. */

import { getProfile } from "./mockData";

export type LocalConvo = {
  otherId: string;
  name: string;
  photo: string;
  preview: string;
  unread: number;
  updatedAt: number;
};

const KEY = "talklov_local_inbox_v1";
const PIN_KEY = "talklov_pinned_chats_v1";

/** Fix stale /avatars/*.png after jpg migration; backfill from mock when empty. */
function normalizeConvo(c: LocalConvo): LocalConvo {
  const mock = getProfile(c.otherId);
  let photo = (c.photo || "").trim();
  if (photo.startsWith("/avatars/") && photo.endsWith(".png")) {
    photo = photo.slice(0, -4) + ".jpg";
  }
  if (!photo && mock?.photo) photo = mock.photo;
  const name = (c.name || "").trim() || mock?.name || c.name;
  return { ...c, photo, name };
}

function read(): LocalConvo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as LocalConvo[];
    if (!Array.isArray(list)) return [];
    let dirty = false;
    const next = list.map((c) => {
      const n = normalizeConvo(c);
      if (n.photo !== c.photo || n.name !== c.name) dirty = true;
      return n;
    });
    if (dirty) {
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    }
    return next;
  } catch {
    return [];
  }
}

function write(list: LocalConvo[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("talklov-inbox"));
  } catch {}
}

export function listLocalConvos(): LocalConvo[] {
  return sortByPinThenTime(read(), (c) => c.otherId, (c) => c.updatedAt);
}

function readPinnedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PIN_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(list) ? list.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writePinnedIds(ids: string[]) {
  try {
    localStorage.setItem(PIN_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event("talklov-inbox"));
  } catch {}
}

export function listPinnedChatIds(): string[] {
  return readPinnedIds();
}

export function isChatPinned(otherId: string): boolean {
  return readPinnedIds().includes(otherId);
}

/** Pin (move to front of pin list) or unpin a chat by partner id. */
export function setChatPinned(otherId: string, pinned: boolean) {
  if (!otherId) return;
  const cur = readPinnedIds().filter((id) => id !== otherId);
  writePinnedIds(pinned ? [otherId, ...cur] : cur);
}

export function toggleChatPinned(otherId: string): boolean {
  const next = !isChatPinned(otherId);
  setChatPinned(otherId, next);
  return next;
}

/** Pinned first (pin order), then by time descending. */
export function sortByPinThenTime<T>(
  items: T[],
  getId: (item: T) => string,
  getTime: (item: T) => number
): T[] {
  const pins = readPinnedIds();
  const rank = new Map(pins.map((id, i) => [id, i]));
  return [...items].sort((a, b) => {
    const ai = rank.get(getId(a));
    const bi = rank.get(getId(b));
    const ap = ai !== undefined;
    const bp = bi !== undefined;
    if (ap && bp) return ai! - bi!;
    if (ap) return -1;
    if (bp) return 1;
    return getTime(b) - getTime(a);
  });
}

export function totalUnread(): number {
  return read().reduce((n, c) => n + (c.unread || 0), 0);
}

export function upsertLocalConvo(
  partial: Omit<LocalConvo, "updatedAt"> & { updatedAt?: number }
) {
  const list = read();
  const i = list.findIndex((c) => c.otherId === partial.otherId);
  const mock = getProfile(partial.otherId);
  const next = normalizeConvo({
    otherId: partial.otherId,
    name: partial.name || mock?.name || "用户",
    photo: partial.photo || mock?.photo || "",
    preview: partial.preview,
    unread: partial.unread,
    updatedAt: partial.updatedAt ?? Date.now(),
  });
  if (i >= 0) list[i] = { ...list[i], ...next };
  else list.unshift(next);
  write(list);
  markActiveChatPartner(partial.otherId);
}

/** Mark conversation read when user opens the chat. */
export function markLocalConvoRead(otherId: string) {
  const list = read();
  let changed = false;
  for (const c of list) {
    if (c.otherId === otherId && c.unread) {
      c.unread = 0;
      changed = true;
    }
  }
  if (changed) write(list);
}

export function subscribeInbox(onChange: () => void): () => void {
  const handler = () => onChange();
  window.addEventListener("talklov-inbox", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("talklov-inbox", handler);
    window.removeEventListener("storage", handler);
  };
}

/** Hide people you've already greeted / chatted with from Discover. */
export const HIDE_ACTIVE_CHATS_FROM_DISCOVER = true;

const ACTIVE_KEY = "talklov_active_chats_v1";

function readActiveIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Record that we've started a conversation with this profile (hello accepted / chat). */
export function markActiveChatPartner(otherId: string) {
  if (!otherId || typeof window === "undefined") return;
  const list = readActiveIds();
  if (list.includes(otherId)) return;
  try {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify([otherId, ...list]));
  } catch {}
}

export function listActiveChatPartnerIds(): string[] {
  // Also treat local inbox threads as active chats
  const fromInbox = listLocalConvos().map((c) => c.otherId);
  return [...new Set([...readActiveIds(), ...fromInbox])];
}
