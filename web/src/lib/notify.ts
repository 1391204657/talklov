/** Local notification prefs helpers (PWA / mobile web). */

export type NotifyPrefs = {
  push: boolean;
  badge: boolean;
  sound: boolean;
};

export const defaultNotifyPrefs: NotifyPrefs = {
  push: false,
  badge: true,
  sound: true,
};

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function requestNotifyPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function setAppBadgeCount(count: number, enabled: boolean) {
  if (typeof navigator === "undefined") return;
  try {
    if (!enabled || count <= 0) {
      if ("clearAppBadge" in navigator) {
        await (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge();
      }
      return;
    }
    if ("setAppBadge" in navigator) {
      await (navigator as Navigator & { setAppBadge: (n?: number) => Promise<void> }).setAppBadge(
        count
      );
    }
  } catch {
    /* unsupported */
  }
}

/** Short soft beep via Web Audio (no asset file). */
export function playMessageSound(enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.28);
    osc.onended = () => ctx.close().catch(() => {});
  } catch {
    /* ignore */
  }
}

export function showLocalMessageNotification(
  title: string,
  body: string,
  enabled: boolean
) {
  if (!enabled || typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body,
      icon: "/brand/talklov-app-icon-192.png",
      tag: "talklov-message",
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* ignore */
  }
}
