/** Local demo inbox for AI partners (mei / jack) — survives refresh. */

export type LocalConvo = {
  otherId: string;
  name: string;
  photo: string;
  preview: string;
  unread: number;
  updatedAt: number;
};

const KEY = "talklov_local_inbox_v1";

function read(): LocalConvo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as LocalConvo[];
    return Array.isArray(list) ? list : [];
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
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function totalUnread(): number {
  return read().reduce((n, c) => n + (c.unread || 0), 0);
}

export function upsertLocalConvo(
  partial: Omit<LocalConvo, "updatedAt"> & { updatedAt?: number }
) {
  const list = read();
  const i = list.findIndex((c) => c.otherId === partial.otherId);
  const next: LocalConvo = {
    otherId: partial.otherId,
    name: partial.name,
    photo: partial.photo,
    preview: partial.preview,
    unread: partial.unread,
    updatedAt: partial.updatedAt ?? Date.now(),
  };
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

/**
 * Testing period: keep people you've already greeted/chatted with visible in Discover.
 * Flip to `true` before public launch to hide active chat partners from the feed.
 */
export const HIDE_ACTIVE_CHATS_FROM_DISCOVER = false;

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
