"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { profiles as mockProfiles } from "@/lib/mockData";
import { useApp } from "@/lib/store";
import { Profile } from "@/lib/types";
import {
  acceptIcebreaker,
  declineIcebreaker,
  fetchConversations,
  fetchPendingIcebreakers,
  subscribePendingIcebreakers,
  type ConversationSummary,
  type PendingIcebreaker,
} from "@/lib/db";

interface QueueItem {
  id: string;
  text: string;
  sender: Profile;
}

export default function Messages() {
  const { tier, configured, userId } = useApp();
  const router = useRouter();
  const useBackend = configured && !!userId;

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [convos, setConvos] = useState<ConversationSummary[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  // Offline demo: a sample incoming opener so the queue UI is visible.
  useEffect(() => {
    if (useBackend) return;
    const ryan = mockProfiles.find((p) => p.id === "ryan");
    if (ryan) {
      setQueue([
        {
          id: "demo",
          sender: ryan,
          text: "Hi! 我在学中文，看到你也喜欢旅行，想跟你练练口语 😊 / practice together?",
        },
      ]);
    }
  }, [useBackend]);

  // Backend: load pending openers + accepted conversations, subscribe to changes.
  useEffect(() => {
    if (!useBackend || !userId) return;
    const load = () => {
      fetchPendingIcebreakers()
        .then((rows: PendingIcebreaker[]) =>
          setQueue(
            rows.map((r) => ({ id: r.id, text: r.text, sender: r.sender }))
          )
        )
        .catch(() => {});
      fetchConversations()
        .then(setConvos)
        .catch(() => {});
    };
    load();
    const unsub = subscribePendingIcebreakers(userId, load);
    return () => unsub();
  }, [useBackend, userId]);

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
    setQueue((q) => q.filter((x) => x.id !== item.id));
    setBusy(null);
    router.push(`/chat/${item.sender.id}`);
  };

  const onDecline = async (item: QueueItem) => {
    if (useBackend) {
      declineIcebreaker(item.id).catch(() => {});
    }
    setQueue((q) => q.filter((x) => x.id !== item.id));
  };

  if (tier === "guest") {
    return (
      <EmptyState
        title="还没有会话"
        desc="去发现页找到合拍的人，打个招呼就能开始聊天。"
      />
    );
  }

  const offlineConvos = mockProfiles.slice(0, 3);

  return (
    <main className="pt-3">
      {/* Pending opener queue (待接受) */}
      {queue.length > 0 && (
        <section className="px-4 pb-2">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <span>💌 待接受</span>
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
                    className="h-11 w-11 shrink-0 rounded-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${item.sender.photo})` }}
                  />
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

      {/* Conversation list */}
      {useBackend ? (
        <ul className="divide-y divide-line">
          {convos.map((c) => (
            <li key={c.conversationId}>
              <Link
                href={`/chat/${c.otherId}`}
                className="flex items-center gap-3 px-4 py-3 active:bg-surface"
              >
                <div
                  className="h-12 w-12 shrink-0 rounded-full bg-cover bg-center bg-surface-2"
                  style={{ backgroundImage: `url(${c.other.photo})` }}
                />
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{c.other.name}</span>
                </div>
              </Link>
            </li>
          ))}
          {convos.length === 0 && queue.length === 0 && (
            <li className="p-10 text-center text-sm text-muted">
              还没有会话，去发现页打个招呼吧～
            </li>
          )}
        </ul>
      ) : (
        <ul className="divide-y divide-line">
          {offlineConvos.map((p, i) => (
            <li key={p.id}>
              <Link
                href={`/chat/${p.id}`}
                className="flex items-center gap-3 px-4 py-3 active:bg-surface"
              >
                <div
                  className="h-12 w-12 shrink-0 rounded-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${p.photo})` }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-[11px] text-muted">上午 9:3{i}</span>
                  </div>
                  <div className="truncate text-sm text-muted">
                    {i === 0 ? "谢谢！我们可以互相帮助 🙌" : "很高兴认识你 😊"}
                  </div>
                </div>
                {i === 0 && (
                  <span className="h-5 min-w-5 rounded-full bg-accent px-1 text-center text-[11px] leading-5 text-white">
                    2
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
      <div className="text-5xl">💬</div>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-sm text-muted">{desc}</p>
      <Link
        href="/discover"
        className="btn-grad mt-3 rounded-xl px-5 py-2.5 text-sm font-semibold"
      >
        去发现
      </Link>
    </main>
  );
}
