/** Remember last email + soft-lock session for one-tap resume on this device. */

const LAST_EMAIL_KEY = "talklov_last_email";
const SESSION_LOCKED_KEY = "talklov_session_locked";

export function getLastAuthEmail(): string | null {
  try {
    const v = localStorage.getItem(LAST_EMAIL_KEY)?.trim().toLowerCase() || "";
    return v.includes("@") ? v : null;
  } catch {
    return null;
  }
}

export function setLastAuthEmail(email: string | null | undefined) {
  const trimmed = (email || "").trim().toLowerCase();
  try {
    if (trimmed.includes("@")) localStorage.setItem(LAST_EMAIL_KEY, trimmed);
  } catch {
    /* ignore */
  }
}

export function isSessionLocked(): boolean {
  try {
    return localStorage.getItem(SESSION_LOCKED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSessionLocked(locked: boolean) {
  try {
    if (locked) localStorage.setItem(SESSION_LOCKED_KEY, "1");
    else localStorage.removeItem(SESSION_LOCKED_KEY);
  } catch {
    /* ignore */
  }
}

export function emailsMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const x = (a || "").trim().toLowerCase();
  const y = (b || "").trim().toLowerCase();
  return !!x && !!y && x === y;
}
