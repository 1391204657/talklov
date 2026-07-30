/** Local notification prefs helpers (PWA / mobile web). */

export type NotifyPrefs = {
  push: boolean;
  badge: boolean;
  sound: boolean;
};

export const defaultNotifyPrefs: NotifyPrefs = {
  push: true,
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
  enabled: boolean,
  openUrl = "/messages"
) {
  if (!enabled || typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body,
      icon: "/brand/talklov-app-icon-192.png",
      tag: "talklov-message",
      data: { url: openUrl },
    });
    n.onclick = () => {
      window.focus();
      try {
        const url =
          (n as Notification & { data?: { url?: string } }).data?.url || openUrl;
        if (url) window.location.assign(url);
      } catch {
        window.location.assign(openUrl);
      }
      n.close();
    };
  } catch {
    /* ignore */
  }
}

/** Incoming-call notification (stays until user interacts, when supported). */
export function showIncomingCallNotification(
  title: string,
  body: string,
  enabled: boolean,
  openUrl: string
) {
  if (!enabled || typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body,
      icon: "/brand/talklov-app-icon-192.png",
      tag: "talklov-incoming-call",
      requireInteraction: true,
      data: { url: openUrl },
    });
    n.onclick = () => {
      window.focus();
      try {
        window.location.assign(openUrl);
      } catch {
        /* ignore */
      }
      n.close();
    };
  } catch {
    /* ignore */
  }
}

type RingtoneHandle = {
  stop: () => void;
};

let activeRingtone: RingtoneHandle | null = null;

/**
 * Looping dual-tone ringtone + vibration. Default ON for incoming calls
 * (independent of message "sound" preference). Call stopCallRingtone() to end.
 */
export function startCallRingtone(enabled = true): void {
  stopCallRingtone();
  if (!enabled || typeof window === "undefined") return;

  try {
    if (navigator.vibrate) {
      navigator.vibrate([400, 200, 400, 200, 400, 800]);
    }
  } catch {
    /* ignore */
  }

  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    void ctx.resume().catch(() => {});

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const ringOnce = () => {
      if (stopped) return;
      const now = ctx.currentTime;
      const makeTone = (freq: number, t0: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + dur + 0.02);
      };
      // classic phone-ish double ring
      makeTone(440, now, 0.35);
      makeTone(480, now, 0.35);
      makeTone(440, now + 0.45, 0.35);
      makeTone(480, now + 0.45, 0.35);
      try {
        if (navigator.vibrate) navigator.vibrate([350, 150, 350]);
      } catch {
        /* ignore */
      }
      timer = setTimeout(ringOnce, 1800);
    };

    ringOnce();
    activeRingtone = {
      stop: () => {
        stopped = true;
        if (timer) clearTimeout(timer);
        timer = null;
        try {
          if (navigator.vibrate) navigator.vibrate(0);
        } catch {
          /* ignore */
        }
        void ctx.close().catch(() => {});
      },
    };
  } catch {
    /* ignore */
  }
}

export function stopCallRingtone(): void {
  if (activeRingtone) {
    activeRingtone.stop();
    activeRingtone = null;
  }
}
