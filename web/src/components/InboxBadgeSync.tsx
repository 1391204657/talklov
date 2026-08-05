"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/lib/store";
import {
  setBackendPendingCount,
  totalBadgeCount,
} from "@/lib/unreadBadge";

/** Quiet badge sync — one inbox poll on login, then every 90s. No realtime storm. */
export default function InboxBadgeSync() {
  const { userId, configured, applyUnreadBadge } = useApp();
  const badgeRef = useRef(applyUnreadBadge);
  badgeRef.current = applyUnreadBadge;

  useEffect(() => {
    if (!configured || !userId) return;
    let cancelled = false;

    const refresh = () => {
      void fetch("/api/inbox", {
        cache: "no-store",
        credentials: "same-origin",
      })
        .then(async (res) => {
          if (!res.ok || cancelled) return;
          const json = (await res.json()) as {
            pendingCount?: number;
            pending?: unknown[];
          };
          setBackendPendingCount(
            json.pendingCount ??
              (Array.isArray(json.pending) ? json.pending.length : 0)
          );
          badgeRef.current(totalBadgeCount());
        })
        .catch(() => {
          /* ignore */
        });
    };

    refresh();
    const t = window.setInterval(refresh, 90_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [configured, userId]);

  return null;
}
