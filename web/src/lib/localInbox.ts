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
