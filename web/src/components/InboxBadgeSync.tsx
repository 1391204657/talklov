"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store";
import { fetchPendingIcebreakers, subscribePendingIcebreakers } from "@/lib/db";
import { totalBadgeCount } from "@/lib/unreadBadge";

/**
 * Keeps TabBar / home-screen badge in sync with pending hellos even when
 * the user is not on the Messages page.
 */
export default function InboxBadgeSync() {
  const { userId, configured, applyUnreadBadge } = useApp();

  useEffect(() => {
    if (!configured || !userId) return;
    let cancelled = false;
    const refresh = () => {
      fetchPendingIcebreakers()
        .then(() => {
          if (!cancelled) applyUnreadBadge(totalBadgeCount());
        })
        .catch(() => {
          if (!cancelled) applyUnreadBadge(totalBadgeCount());
        });
    };
    refresh();
    const unsub = subscribePendingIcebreakers(userId, refresh);
    const t = window.setInterval(refresh, 60_000);
    return () => {
      cancelled = true;
      unsub();
      window.clearInterval(t);
    };
  }, [configured, userId, applyUnreadBadge]);

  return null;
}
