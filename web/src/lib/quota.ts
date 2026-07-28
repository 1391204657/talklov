// Daily opener quota (anti-spam). Free/unverified men are rate-limited;
// women and verified users are effectively unlimited.
// Stored per-day in localStorage for the mock; move to the DB later.

export const DAILY_OPENER_LIMIT = 5;

function todayKey() {
  return "nihello_openers_" + new Date().toISOString().slice(0, 10);
}

export function getOpenerCountToday(): number {
  try {
    return Number(localStorage.getItem(todayKey()) || "0");
  } catch {
    return 0;
  }
}

export function incrementOpenerToday(): void {
  try {
    localStorage.setItem(todayKey(), String(getOpenerCountToday() + 1));
  } catch {}
}

/** Whether this user is subject to the daily opener limit. */
export function isRateLimited(gender: string, tier: string): boolean {
  return gender === "male" && tier !== "verified";
}

export function openersLeftToday(gender: string, tier: string): number {
  if (!isRateLimited(gender, tier)) return Infinity;
  return Math.max(0, DAILY_OPENER_LIMIT - getOpenerCountToday());
}
