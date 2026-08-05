"use client";

import { useEffect, useState } from "react";
import { profiles as mockProfiles } from "@/lib/mockData";
import { useApp } from "@/lib/store";
import { Profile } from "@/lib/types";
import MeAvatarButton from "@/components/MeAvatarButton";
import {
  acceptIcebreaker,
  declineIcebreaker,
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
import {
  setBackendPendingCount,
  totalBadgeCount,
} from "@/lib/unreadBadge";
import { cacheDiscoverProfiles } from "@/lib/profileCache";

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

export default function MessagesClient() {
  const { tier, configured, userId, myProfile, applyUnreadBadge, locale } =
    useApp();
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
  const [loadErr, setLoadErr] = useState<string | null>(null);
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
      try {
        applyUnreadBadge(totalBadgeCount());
      } catch {
        /* ignore */
      }
    };
    refresh();
    return subscribeInbox(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One inbox fetch — first paint never blocked; 8s abort for Safari.
  useEffect(() => {
    if (!useBackend || !userId) return;
    let cancelled = false;
    const ac = new AbortController();
    const timer = window.setTimeout(() => ac.abort(), 8000);

    (async () => {
      try {
        const res = await fetch("/api/inbox", {
          cache: "no-store",
          credentials: "same-origin",
          signal: ac.signal,
        });
        if (cancelled) return;
        if (!res.ok) {
          setLoadErr("消息同步失败，点重试");
          return;
        }
        const json = (await res.json()) as {
          pending?: PendingIcebreaker[];
          conversations?: ConversationSummary[];
          pendingCount?: number;
        };
        setBackendPendingCount(json.pendingCount ?? json.pending?.length ?? 0);
        setQueue(
          (json.pending || []).map((r) => ({
            id: r.id,
            text: r.text,
            sender: r.sender,
          }))
        );
        setConvos(json.conversations || []);
        setLoadErr(null);
        applyUnreadBadge(totalBadgeCount());
      } catch {
        if (!cancelled) setLoadErr("网络超时，点重试");
      } finally {
        window.clearTimeout(timer);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useBackend, userId]);

  const retryLoad = () => {
    setLoadErr(null);
    void fetch("/api/inbox", { cache: "no-store", credentials: "same-origin" })
      .then(async (res) => {
        if (!res.ok) throw new Error("fail");
        const json = (await res.json()) as {
          pending?: PendingIcebreaker[];
          conversations?: ConversationSummary[];
          pendingCount?: number;
        };
        setBackendPendingCount(json.pendingCount ?? json.pending?.length ?? 0);
        setQueue(
          (json.pending || []).map((r) => ({
            id: r.id,
            text: r.text,
            sender: r.sender,
          }))
        );
        setConvos(json.conversations || []);
        applyUnreadBadge(totalBadgeCount());
      })
      .catch(() => setLoadErr("仍失败，请稍后再试"));
  };

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
      setBackendPendingCount(next.length);
      applyUnreadBadge(totalBadgeCount());
      return next;
    });
    setBusy(null);
    window.location.assign(`/chat/${item.sender.id}`);
  };

  const onDecline = async (item: QueueItem) => {
    if (useBackend) {
      declineIcebreaker(item.id).catch(() => {});
    }
    setQueue((q) => {
      const next = q.filter((x) => x.id !== item.id);
      setBackendPendingCount(next.length);
      applyUnreadBadge(totalBadgeCount());
      return next;
    });
  };

  const pickShareTarget = (id: string) => {
    if (shareDraft) writeOpenerDraft(shareDraft);
    window.location.assign(`/chat/${id}`);
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
    (c) => (c.lastMessageAt ? new Date(c.lastMessageAt).getTime() : 0)
  );

  useEffect(() => {
    const peers = convos.map((c) => c.other).filter(Boolean);
    if (peers.length) cacheDiscoverProfiles(peers);
  }, [convos]);

  if (!loggedIn) {
    return (
      <main>
        <header className="sticky top-0 z-20 flex items-center justify-end bg-background px-4 py-2">
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
      <header className="sticky top-0 z-20 flex items-center justify-end bg-background px-4 py-2">
        <MeAvatarButton />
      </header>
      <div className="pt-1">
        {loadErr && (
          <div className="mx-4 mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
            <p>{loadErr}</p>
            <button
              type="button"
              onClick={retryLoad}
              className="mt-2 text-accent underline"
            >
              {en ? "Retry" : "重试"}
            </button>
          </div>
        )}

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
                    <Avatar
                      name={item.sender?.name}
                      photo={item.sender?.photo}
                      size="h-11 w-11"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 font-medium">
                        {item.sender?.name || "用户"}
                        <span className="text-xs">
                          {item.sender?.country === "US" ? "🇺🇸" : "🇨🇳"}
                        </span>
                      </div>
                      <div className="text-[13px] leading-snug text-muted">
                        {item.text}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void onDecline(item)}
                      className="flex-1 rounded-xl border border-line py-2 text-sm text-muted"
                    >
                      忽略
                    </button>
                    <button
                      type="button"
                      disabled={busy === item.id}
                      onClick={() => void onAccept(item)}
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
          {localConvos.map((c) => {
            const pinned = isChatPinned(c.otherId);
            return (
              <li key={c.otherId}>
                <a
                  href={`/chat/${c.otherId}`}
                  className={`flex items-center gap-3 px-4 py-3 active:bg-surface ${
                    pinned ? "bg-surface-2/70" : ""
                  }`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openPinMenu(c.otherId, c.name);
                  }}
                >
                  <Avatar name={c.name} photo={c.photo} size="h-12 w-12" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1 font-medium">
                        {pinned && <PinIcon />}
                        <span className="truncate">{c.name}</span>
                      </span>
                    </div>
                    <div className="truncate text-sm text-muted">{c.preview}</div>
                  </div>
                  {c.unread > 0 && (
                    <span className="h-5 min-w-5 rounded-full bg-accent px-1.5 text-center text-[11px] leading-5 text-white">
                      {c.unread}
                    </span>
                  )}
                </a>
              </li>
            );
          })}

          {useBackend &&
            sortedBackend.map((c) => {
              const pinned = isChatPinned(c.otherId);
              const name = c.other?.name || "用户";
              return (
                <li key={c.conversationId}>
                  <a
                    href={`/chat/${c.otherId}`}
                    className={`flex items-center gap-3 px-4 py-3 active:bg-surface ${
                      pinned ? "bg-surface-2/70" : ""
                    }`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      openPinMenu(c.otherId, name);
                    }}
                  >
                    <Avatar
                      name={name}
                      photo={c.other?.photo}
                      size="h-12 w-12"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 font-medium">
                        {pinned && <PinIcon />}
                        <span className="truncate">{name}</span>
                      </span>
                    </div>
                  </a>
                </li>
              );
            })}

          {empty && !loadErr && (
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

function Avatar({
  name,
  photo,
  size,
}: {
  name?: string;
  photo?: string;
  size: string;
}) {
  const [broken, setBroken] = useState(false);
  const src =
    photo && photo.startsWith("/avatars/") && photo.endsWith(".png")
      ? `${photo.slice(0, -4)}.jpg`
      : photo;
  const showImg = Boolean(src) && !broken;

  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-sm font-semibold text-muted`}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        (name || "?").slice(0, 1)
      )}
    </div>
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
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 sm:items-center">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-t-3xl border border-line bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
        <p className="text-center text-sm text-muted">{name}</p>
        <button
          type="button"
          onClick={onToggle}
          className="mt-3 w-full rounded-xl bg-accent/15 py-3 text-sm font-medium text-accent"
        >
          {pinned
            ? en
              ? "Unpin chat"
              : "取消置顶"
            : en
              ? "Pin chat"
              : "置顶聊天"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-xl py-3 text-sm text-muted"
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
    <div className="flex flex-col items-center px-8 py-16 text-center">
      <svg
        viewBox="0 0 48 48"
        className="h-14 w-14 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          d="M8 14a6 6 0 0 1 6-6h20a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H20l-8 6v-6h-2a6 6 0 0 1-6-6V14Z"
          strokeLinejoin="round"
        />
      </svg>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted">{desc}</p>
      <a
        href="/discover"
        className="btn-grad mt-6 rounded-2xl px-6 py-3 text-sm font-semibold text-white"
      >
        {cta}
      </a>
    </div>
  );
}
