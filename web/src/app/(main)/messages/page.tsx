"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { profiles as mockProfiles } from "@/lib/mockData";
import { useApp } from "@/lib/store";
import { Profile } from "@/lib/types";
import MeAvatarButton from "@/components/MeAvatarButton";
import {
  acceptIcebreaker,
  declineIcebreaker,
  fetchConversations,
  fetchPendingIcebreakers,
  subscribePendingIcebreakers,
  type ConversationSummary,
  type PendingIcebreaker,
} from "@/lib/db";
import { consumeOpenerDraft, writeOpenerDraft } from "@/lib/datingSim";
import {
  isChatPinned,
  listLocalConvos,
  setChatPinned,
  sortByPinThenTime,
  subscribeInbox,
  type LocalConvo,
} from "@/lib/localInbox";
import { totalBadgeCount } from "@/lib/unreadBadge";

interface QueueItem {
  id: string;
  text: string;
  sender: Profile;
}

type PinTarget = {
  otherId: string;
  name: string;
  pinned: boolean;
};

export default function Messages() {
  const { tier, configured, userId, myProfile, applyUnreadBadge, notifyPrefs, locale } =
    useApp();
  const router = useRouter();
  const useBackend = configured && !!userId;
  const loggedIn = tier !== "guest" || !!userId || !!myProfile.phoneE164;
  const en = locale === "en";

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [convos, setConvos] = useState<ConversationSummary[]>([]);
  const [localConvos, setLocalConvos] = useState<LocalConvo[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [shareMode, setShareMode] = useState(false);
  const [shareDraft, setShareDraft] = useState("");
  const [pinTarget, setPinTarget] = useState<PinTarget | null>(null);
  const [, setPinTick] = useState(0);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("share") !== "1") return;
    setShareMode(true);
    const d = consumeOpenerDraft();
    if (d) {
      setShareDraft(d);
      writeOpenerDraft(d);
    }
  }, []);

  useEffect(() => {
    const refresh = () => {
      setLocalConvos(listLocalConvos());
      setPinTick((n) => n + 1);
      applyUnreadBadge(totalBadgeCount());
    };
    refresh();
    return subscribeInbox(refresh);
  }, [applyUnreadBadge, notifyPrefs.badge]);

  // Backend: load pending openers + accepted conversations, subscribe to changes.
  useEffect(() => {
    if (!useBackend || !userId) return;
    const load = () => {
      fetchPendingIcebreakers()
        .then((rows: PendingIcebreaker[]) => {
          setQueue(
            rows.map((r) => ({ id: r.id, text: r.text, sender: r.sender }))
          );
          applyUnreadBadge(totalBadgeCount());
        })
        .catch(() => {});
      fetchConversations()
        .then(setConvos)
        .catch(() => {});
    };
    load();
    const unsub = subscribePendingIcebreakers(userId, load);
    return () => unsub();
  }, [useBackend, userId, applyUnreadBadge]);

  const onAccept = async (item: QueueItem) => {
    if (useBackend) {
      setBusy(item.id);
      try {
        await acceptIcebreaker(item.id);
      } catch {
        setBusy(null);
        return;
      }
    }
    setQueue((q) => {
      const next = q.filter((x) => x.id !== item.id);
      void import("@/lib/unreadBadge").then(({ setBackendPendingCount, totalBadgeCount }) => {
        setBackendPendingCount(next.length);
        applyUnreadBadge(totalBadgeCount());
      });
      return next;
    });
    setBusy(null);
    router.push(`/chat/${item.sender.id}`);
  };

  const onDecline = async (item: QueueItem) => {
    if (useBackend) {
      declineIcebreaker(item.id).catch(() => {});
    }
    setQueue((q) => {
      const next = q.filter((x) => x.id !== item.id);
      void import("@/lib/unreadBadge").then(({ setBackendPendingCount, totalBadgeCount }) => {
        setBackendPendingCount(next.length);
        applyUnreadBadge(totalBadgeCount());
      });
      return next;
    });
  };

  const pickShareTarget = (id: string) => {
    if (shareDraft) writeOpenerDraft(shareDraft);
    router.push(`/chat/${id}`);
  };

  const openPinMenu = (otherId: string, name: string) => {
    setPinTarget({
      otherId,
      name,
      pinned: isChatPinned(otherId),
    });
  };

  const confirmPinToggle = () => {
    if (!pinTarget) return;
    setChatPinned(pinTarget.otherId, !pinTarget.pinned);
    setPinTarget(null);
    setLocalConvos(listLocalConvos());
    setPinTick((n) => n + 1);
  };

  const shareCandidates = mockProfiles
    .filter((p) => p.country === "US")
    .slice(0, 6);

  const sortedBackend = sortByPinThenTime(
    convos,
    (c) => c.otherId,
    () => 0
  );

  if (!loggedIn) {
    return (
      <main>
        <header className="sticky top-0 z-20 flex items-center justify-end bg-background/90 px-4 py-2 backdrop-blur">
          <MeAvatarButton />
        </header>
        <EmptyState
          title={en ? "No conversations yet" : "还没有会话"}
          desc={
            en
              ? "Find someone on Discover and say hello to start chatting."
              : "去发现页找到合拍的人，打个招呼就能开始聊天。"
          }
          cta={en ? "Discover" : "去发现"}
        />
      </main>
    );
  }

  const hasLocal = localConvos.length > 0;
  const empty =
    !shareMode &&
    queue.length === 0 &&
    (useBackend ? convos.length === 0 : !hasLocal);

  return (
    <main>
      <header className="sticky top-0 z-20 flex items-center justify-end bg-background/90 px-4 py-2 backdrop-blur">
        <MeAvatarButton />
      </header>
      <div className="pt-1">
        {shareMode && (
          <section className="mx-4 mb-3 rounded-2xl border border-accent/30 bg-accent/10 p-3">
            <div className="text-sm font-semibold">发送练习成果给搭子</div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              选择一位美区搭子，开场白会自动填入聊天框。
            </p>
            {shareDraft ? (
              <p className="mt-2 line-clamp-3 rounded-xl bg-background/80 px-3 py-2 text-xs leading-relaxed">
                {shareDraft}
              </p>
            ) : null}
            <ul className="mt-3 space-y-2">
              {shareCandidates.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => pickShareTarget(p.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 text-left"
                  >
                    <div
                      className="h-10 w-10 rounded-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${p.photo})` }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{p.name}</div>
                      <div className="truncate text-[11px] text-muted">
                        {p.city}
                      </div>
                    </div>
                    <span className="text-xs text-accent">发送</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {queue.length > 0 && (
          <section className="px-4 pb-2">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <span>待接受</span>
              <span className="rounded-full bg-accent px-1.5 text-[11px] leading-5 text-white">
                {queue.length}
              </span>
            </div>
            <p className="mb-2 text-[11px] text-muted">
              对方向你发来了开场白。接受后开始聊天，忽略则不会通知对方。
            </p>
            <div className="space-y-2">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="animate-fadeUp rounded-2xl border border-line bg-surface p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 bg-cover bg-center text-sm font-semibold text-muted"
                      style={
                        item.sender.photo
                          ? { backgroundImage: `url(${item.sender.photo})` }
                          : undefined
                      }
                    >
                      {!item.sender.photo
                        ? (item.sender.name || "?").slice(0, 1)
                        : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 font-medium">
                        {item.sender.name}
                        <span className="text-xs">
                          {item.sender.country === "US" ? "🇺🇸" : "🇨🇳"}
                        </span>
                      </div>
                      <div className="text-[13px] leading-snug text-muted">
                        {item.text}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => onDecline(item)}
                      className="flex-1 rounded-xl border border-line py-2 text-sm text-muted"
                    >
                      忽略
                    </button>
                    <button
                      disabled={busy === item.id}
                      onClick={() => onAccept(item)}
                      className="btn-grad flex-1 rounded-xl py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      {busy === item.id ? "…" : "接受并聊天"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <ul className="divide-y divide-line">
          {/* Local AI / demo chats (美琪、Jack…) */}
          {localConvos.map((c) => {
            const pinned = isChatPinned(c.otherId);
            return (
              <li key={c.otherId}>
                <ConvoRow
                  href={`/chat/${c.otherId}`}
                  pinned={pinned}
                  onLongPress={() => openPinMenu(c.otherId, c.name)}
                >
                  <div
                    className="h-12 w-12 shrink-0 rounded-full bg-cover bg-center bg-surface-2"
                    style={{ backgroundImage: `url(${c.photo})` }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1 font-medium">
                        {pinned && <PinIcon />}
                        <span className="truncate">{c.name}</span>
                      </span>
                      <span className="shrink-0 text-[11px] text-muted">
                        {en ? "Just now" : "刚刚"}
                      </span>
                    </div>
                    <div className="truncate text-sm text-muted">{c.preview}</div>
                  </div>
                  {c.unread > 0 && (
                    <span className="h-5 min-w-5 rounded-full bg-accent px-1.5 text-center text-[11px] leading-5 text-white">
                      {c.unread}
                    </span>
                  )}
                </ConvoRow>
              </li>
            );
          })}

          {useBackend &&
            sortedBackend.map((c) => {
              const pinned = isChatPinned(c.otherId);
              return (
                <li key={c.conversationId}>
                  <ConvoRow
                    href={`/chat/${c.otherId}`}
                    pinned={pinned}
                    onLongPress={() => openPinMenu(c.otherId, c.other.name)}
                  >
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 bg-cover bg-center text-sm font-semibold text-muted"
                      style={
                        c.other.photo
                          ? { backgroundImage: `url(${c.other.photo})` }
                          : undefined
                      }
                    >
                      {!c.other.photo
                        ? (c.other.name || "?").slice(0, 1)
                        : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 font-medium">
                        {pinned && <PinIcon />}
                        <span className="truncate">{c.other.name}</span>
                      </span>
                    </div>
                  </ConvoRow>
                </li>
              );
            })}

          {empty && (
            <li className="p-10 text-center text-sm text-muted">
              {en
                ? "No conversations yet — say hi on Discover."
                : "还没有会话，去发现页打个招呼吧～"}
            </li>
          )}
        </ul>
      </div>

      {pinTarget && (
        <PinActionSheet
          name={pinTarget.name}
          pinned={pinTarget.pinned}
          en={en}
          onToggle={confirmPinToggle}
          onClose={() => setPinTarget(null)}
        />
      )}
    </main>
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0 text-muted"
      fill="currentColor"
      aria-hidden
    >
      <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
    </svg>
  );
}

function ConvoRow({
  href,
  pinned,
  onLongPress,
  children,
}: {
  href: string;
  pinned?: boolean;
  onLongPress: () => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const timer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const startXY = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = () => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const fireLongPress = () => {
    longPressed.current = true;
    clearTimer();
    onLongPress();
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(12);
      } catch {}
    }
  };

  const startPress = (x: number, y: number) => {
    longPressed.current = false;
    startXY.current = { x, y };
    clearTimer();
    timer.current = window.setTimeout(fireLongPress, 450);
  };

  const movePress = (x: number, y: number) => {
    const s = startXY.current;
    if (!s) return;
    // Cancel if finger moves (scrolling the list)
    if (Math.abs(x - s.x) > 10 || Math.abs(y - s.y) > 10) {
      clearTimer();
      startXY.current = null;
    }
  };

  const endPress = () => {
    clearTimer();
    startXY.current = null;
  };

  return (
    // div (not <a>) so iOS Safari won't show link preview / system share sheet
    <div
      role="link"
      tabIndex={0}
      className={`flex items-center gap-3 px-4 py-3 select-none active:bg-surface ${
        pinned ? "bg-surface-2/70" : ""
      }`}
      style={{
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
        touchAction: "pan-y",
      }}
      onClick={() => {
        if (longPressed.current) {
          longPressed.current = false;
          return;
        }
        router.push(href);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(href);
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        fireLongPress();
      }}
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (t) startPress(t.clientX, t.clientY);
      }}
      onTouchMove={(e) => {
        const t = e.touches[0];
        if (t) movePress(t.clientX, t.clientY);
      }}
      onTouchEnd={endPress}
      onTouchCancel={endPress}
      onMouseDown={(e) => {
        if (e.button === 0) startPress(e.clientX, e.clientY);
      }}
      onMouseMove={(e) => {
        if (e.buttons === 1) movePress(e.clientX, e.clientY);
      }}
      onMouseUp={endPress}
      onMouseLeave={endPress}
    >
      {children}
    </div>
  );
}

function PinActionSheet({
  name,
  pinned,
  en,
  onToggle,
  onClose,
}: {
  name: string;
  pinned: boolean;
  en: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        aria-label={en ? "Close" : "关闭"}
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
        <div className="overflow-hidden rounded-2xl bg-surface shadow-xl ring-1 ring-black/5">
          <p className="border-b border-line px-4 py-3 text-center text-xs text-muted">
            {name}
          </p>
          <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-[16px] font-medium text-accent active:bg-surface-2"
          >
            {pinned
              ? en
                ? "Unpin chat"
                : "取消置顶"
              : en
                ? "Pin chat"
                : "置顶聊天"}
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-2xl bg-surface py-3.5 text-[16px] font-semibold shadow-xl ring-1 ring-black/5 active:bg-surface-2"
        >
          {en ? "Cancel" : "取消"}
        </button>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  desc,
  cta,
}: {
  title: string;
  desc: string;
  cta: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
      <svg
        viewBox="0 0 48 48"
        className="h-12 w-12 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 12a4 4 0 0 1 4-4h28a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H20l-8 6v-6h-2a4 4 0 0 1-4-4V12Z" />
      </svg>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-sm text-muted">{desc}</p>
      <Link
        href="/discover"
        className="btn-grad mt-3 rounded-xl px-5 py-2.5 text-sm font-semibold"
      >
        {cta}
      </Link>
    </div>
  );
}
