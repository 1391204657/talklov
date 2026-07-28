// Passes a pending "opening message" from the profile page to the chat page.
// In the real backend this becomes a queued "like + opener" record.

const prefix = "nihello_opener_";

export function saveOpener(profileId: string, text: string) {
  try {
    sessionStorage.setItem(prefix + profileId, text);
  } catch {}
}

export function takeOpener(profileId: string): string | null {
  try {
    const v = sessionStorage.getItem(prefix + profileId);
    if (v) sessionStorage.removeItem(prefix + profileId);
    return v;
  } catch {
    return null;
  }
}
