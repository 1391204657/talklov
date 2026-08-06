"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { isFavorited, toggleFavorite } from "@/lib/favorites";

type Props = {
  targetId: string;
  className?: string;
  /** Larger hit target for profile page */
  size?: "sm" | "md";
};

export default function FavoriteButton({
  targetId,
  className = "",
  size = "sm",
}: Props) {
  const { userId, locale, openRegister, tier, isBanned } = useApp();
  const en = locale === "en";
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const v = await isFavorited(userId, targetId);
      if (!cancelled) setOn(v);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, targetId]);

  if (!targetId || targetId === "me" || targetId === userId) return null;

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    // Guest with no session — ask to register (local tier alone is not enough)
    if (isBanned) return;
    if (!userId && tier === "guest") {
      openRegister(en ? "Save favorites" : "收藏感兴趣的人", targetId);
      return;
    }
    setBusy(true);
    setHint(null);
    try {
      const next = await toggleFavorite(userId, targetId);
      setOn(next);
      setHint(next ? (en ? "Saved" : "已收藏") : en ? "Removed" : "已取消");
      window.setTimeout(() => setHint(null), 1400);
    } catch (err) {
      console.warn("[favorite]", err);
      setHint(en ? "Couldn’t save" : "收藏失败");
      window.setTimeout(() => setHint(null), 1800);
    } finally {
      setBusy(false);
    }
  };

  const dim = size === "md" ? "h-11 w-11" : "h-9 w-9";
  const icon = size === "md" ? "h-5 w-5" : "h-4 w-4";

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-label={on ? (en ? "Unfavorite" : "取消收藏") : en ? "Favorite" : "收藏"}
        title={on ? (en ? "Saved" : "已收藏") : en ? "Save for later" : "先收藏"}
        className={`inline-flex ${dim} items-center justify-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-md transition active:scale-95 disabled:opacity-60 ${
          on ? "!bg-rose-500/90 !border-rose-400/50 !text-white" : ""
        } ${className}`}
      >
        <svg
          viewBox="0 0 24 24"
          className={icon}
          fill={on ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.45A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {hint && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-black/75 px-3.5 py-1.5 text-xs text-white shadow-lg">
          {hint}
        </div>
      )}
    </>
  );
}
