"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdminI18n } from "@/lib/adminI18n";

type Detail = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone_e164: string | null;
    country: string | null;
    city: string | null;
    gender: string | null;
    age: number | null;
    plan: string | null;
    plan_expires_at: string | null;
    is_founder: boolean | null;
    founder_slot: number | null;
    verified: boolean | null;
    bio: string | null;
    native_lang: string | null;
    learning_lang: string | null;
    created_at: string | null;
    referred_by_code: string | null;
    avatar_url: string | null;
    photos: string[] | null;
  };
  behavior: {
    favoritesOut: number;
    favoritesIn: number;
    viewsOut: number;
    viewsIn: number;
    icebreakersSent: number;
    icebreakersRecv: number;
    conversations: number;
    purchases: number;
    moments?: number;
  };
  moments?: {
    id: string;
    body: string;
    tag: string | null;
    media: { type?: string; url?: string }[] | null;
    likesCount: number;
    comments: { by?: string; text?: string }[] | null;
    corrections: { by?: string; text?: string }[] | null;
    createdAt: string;
  }[];
};

type ChatRow = {
  id: string;
  status: string;
  createdAt: string;
  lastMessageAt: string | null;
  peerId: string;
  peerName: string;
  role: "initiator" | "recipient" | string;
  messageCount: number;
  icebreakerPreview: string | null;
  icebreakerStatus: string | null;
};

type Transcript = {
  conversation: {
    id: string;
    status: string;
    initiatorName: string;
    recipientName: string;
    initiatorId: string;
    recipientId: string;
  };
  icebreakers: {
    id: string;
    senderName: string;
    text: string;
    status: string;
    createdAt: string;
  }[];
  messages: {
    id: string;
    senderId: string;
    senderName: string;
    kind: string;
    content: string | null;
    audioUrl: string | null;
    durationSec: number | null;
    translation: string | null;
    flagged: boolean;
    createdAt: string;
  }[];
};

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useAdminI18n();
  const [data, setData] = useState<Detail | null>(null);
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatErr, setChatErr] = useState<string | null>(null);

  const openChat = async (conversationId: string) => {
    if (!id) return;
    setActiveChatId(conversationId);
    setTranscript(null);
    setChatErr(null);
    setChatBusy(true);
    try {
      const res = await fetch(
        `/api/admin/chats/${conversationId}?userId=${encodeURIComponent(id)}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t.loadChatFail);
      setTranscript(json);
    } catch (e) {
      setChatErr(e instanceof Error ? e.message : t.loadChatFail);
    } finally {
      setChatBusy(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const chatFromQuery =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("chat")
        : null;
    (async () => {
      setLoading(true);
      try {
        const [detailRes, chatsRes] = await Promise.all([
          fetch(`/api/admin/users/${id}`),
          fetch(`/api/admin/users/${id}/chats`),
        ]);
        const detailJson = await detailRes.json();
        const chatsJson = await chatsRes.json();
        if (!detailRes.ok) throw new Error(detailJson.error || t.actionFail);
        if (!cancelled) {
          setData(detailJson);
          if (chatsRes.ok) setChats(chatsJson.chats || []);
        }
        if (!cancelled && chatFromQuery) {
          setActiveChatId(chatFromQuery);
          setChatBusy(true);
          try {
            const res = await fetch(
              `/api/admin/chats/${chatFromQuery}?userId=${encodeURIComponent(id)}`
            );
            const json = await res.json();
            if (!cancelled) {
              if (!res.ok) throw new Error(json.error || t.loadChatFail);
              setTranscript(json);
            }
          } catch (e) {
            if (!cancelled)
              setChatErr(e instanceof Error ? e.message : t.loadChatFail);
          } finally {
            if (!cancelled) setChatBusy(false);
          }
        }
      } catch (e) {
        if (!cancelled)
          setErr(e instanceof Error ? e.message : t.actionFail);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, t.actionFail, t.loadChatFail]);

  if (loading) {
    return <div className="text-sm text-zinc-500">{t.loading}</div>;
  }
  if (err || !data) {
    return (
      <div>
        <Link href="/admin/users" className="text-sm text-zinc-400">
          {t.backToUsers}
        </Link>
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {err || t.actionFail}
        </div>
      </div>
    );
  }

  const u = data.user;
  const b = data.behavior;
  const region =
    locale === "zh"
      ? `${u.country === "CN" ? "🇨🇳 中国" : u.country === "US" ? "🇺🇸 美国" : u.country || "—"} · ${u.city || ""}`
      : `${u.country || "—"} · ${u.city || ""}`;

  const stats: [string, number][] = [
    [t.favOut, b.favoritesOut],
    [t.favIn, b.favoritesIn],
    [t.viewOut, b.viewsOut],
    [t.viewIn, b.viewsIn],
    [t.helloSent, b.icebreakersSent],
    [t.helloRecv, b.icebreakersRecv],
    [t.chats, b.conversations],
    [t.purchases, b.purchases],
    [t.momentsCount, b.moments ?? data.moments?.length ?? 0],
  ];

  const moments = data.moments || [];

  return (
    <div>
      <Link href="/admin/users" className="text-sm text-zinc-400 hover:text-white">
        {t.backToUsers}
      </Link>

      <h1 className="mt-3 text-xl font-semibold">{u.name || "—"}</h1>
      <p className="mt-1 text-sm text-zinc-400">
        {u.gender}/{u.age ?? "?"} · {region}
      </p>

      <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-sm font-semibold">{t.detail}</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-zinc-500">{t.region}</dt>
            <dd>{region}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">{t.phone}</dt>
            <dd className="font-mono">{u.phone_e164 || t.noPhone}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">{t.email}</dt>
            <dd>{u.email || t.noEmail}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">{t.plan}</dt>
            <dd>
              {u.plan || "free"}
              {u.is_founder ? ` · Founder #${u.founder_slot}` : ""}
              {u.plan_expires_at ? ` → ${u.plan_expires_at.slice(0, 10)}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">ID</dt>
            <dd className="break-all font-mono text-xs text-zinc-400">{u.id}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">{t.ref}</dt>
            <dd>{u.referred_by_code || "—"}</dd>
          </div>
        </dl>
        {u.bio && <p className="mt-3 text-sm text-zinc-300">{u.bio}</p>}
        {(() => {
          const photos =
            u.photos?.length ? u.photos : u.avatar_url ? [u.avatar_url] : [];
          if (!photos.length) return null;
          return (
            <div className="mt-3 flex flex-wrap gap-2">
              {photos.slice(0, 6).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="h-20 w-20 rounded-lg object-cover bg-black/40"
                />
              ))}
            </div>
          );
        })()}
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-sm font-semibold">{t.behavior}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {stats.map(([label, n]) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"
            >
              <div className="text-[11px] text-zinc-500">{label}</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{n}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-sm font-semibold">{t.momentsTitle}</h2>
        {moments.length === 0 ? (
          <div className="mt-3 text-sm text-zinc-500">{t.momentsEmpty}</div>
        ) : (
          <ul className="mt-3 space-y-3">
            {moments.map((m) => {
              const comments = Array.isArray(m.comments) ? m.comments : [];
              const corrections = Array.isArray(m.corrections)
                ? m.corrections
                : [];
              const imgs = (Array.isArray(m.media) ? m.media : [])
                .map((x) => x?.url)
                .filter(Boolean) as string[];
              return (
                <li
                  key={m.id}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5"
                >
                  <div className="text-[11px] text-zinc-500">
                    {m.createdAt?.slice(0, 16).replace("T", " ")}
                    {m.tag ? ` · #${m.tag}` : ""}
                    {` · ♥ ${m.likesCount ?? 0}`}
                    {` · ${locale === "zh" ? "评" : "c"} ${comments.length}`}
                    {` · ${locale === "zh" ? "纠" : "fix"} ${corrections.length}`}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-200">
                    {m.body || "—"}
                  </p>
                  {imgs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {imgs.slice(0, 4).map((src, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={src}
                          alt=""
                          className="h-14 w-14 rounded-lg object-cover bg-black/40"
                        />
                      ))}
                    </div>
                  )}
                  {(comments.length > 0 || corrections.length > 0) && (
                    <div className="mt-2 space-y-1 border-t border-white/10 pt-2 text-xs text-zinc-400">
                      {comments.slice(0, 5).map((c, i) => (
                        <div key={`c-${i}`}>
                          <span className="text-zinc-300">{c.by || "—"}</span>
                          : {c.text}
                        </div>
                      ))}
                      {corrections.slice(0, 5).map((c, i) => (
                        <div key={`x-${i}`} className="text-amber-200/80">
                          <span className="text-amber-100">{c.by || "—"}</span>
                          : {c.text}
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-sm font-semibold">{t.chatsTitle}</h2>
        <p className="mt-1 text-[11px] text-zinc-500">{t.chatAuditHint}</p>

        {chats.length === 0 ? (
          <div className="mt-4 text-sm text-zinc-500">{t.chatsEmpty}</div>
        ) : (
          <div className="mt-3 space-y-2">
            {chats.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {t.withPeer} {c.peerName}
                    <span className="ml-2 text-[11px] font-normal text-zinc-500">
                      {c.role === "initiator" ? t.asInitiator : t.asRecipient} ·{" "}
                      {t.status}: {c.status}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-zinc-400">
                    {c.icebreakerPreview
                      ? `${t.icebreaker}: ${c.icebreakerPreview}`
                      : "—"}
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-500">
                    {c.messageCount} {t.msgCount}
                    {c.lastMessageAt
                      ? ` · ${c.lastMessageAt.slice(0, 16).replace("T", " ")}`
                      : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void openChat(c.id)}
                  className="shrink-0 rounded-lg border border-white/20 px-2.5 py-1 text-xs hover:bg-white/10"
                >
                  {t.openChat}
                </button>
              </div>
            ))}
          </div>
        )}

        {activeChatId && (
          <div className="mt-4 rounded-xl border border-amber-500/25 bg-black/40 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-xs text-zinc-400">
                {transcript
                  ? `${transcript.conversation.initiatorName} ↔ ${transcript.conversation.recipientName}`
                  : "…"}
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveChatId(null);
                  setTranscript(null);
                  setChatErr(null);
                }}
                className="text-xs text-zinc-400 hover:text-white"
              >
                {t.closeChat}
              </button>
            </div>

            {chatBusy && (
              <div className="text-sm text-zinc-500">{t.loading}</div>
            )}
            {chatErr && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {chatErr}
              </div>
            )}

            {transcript && !chatBusy && (
              <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                {transcript.icebreakers.map((ib) => (
                  <div
                    key={ib.id}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
                  >
                    <div className="text-[11px] text-amber-200/90">
                      {t.icebreaker} · {ib.senderName} · {ib.status}
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-zinc-100">
                      {ib.text}
                    </div>
                    <div className="mt-1 text-[10px] text-zinc-500">
                      {ib.createdAt?.slice(0, 19).replace("T", " ")}
                    </div>
                  </div>
                ))}
                {transcript.messages.map((m) => {
                  const mine = m.senderId === id;
                  return (
                    <div
                      key={m.id}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        mine
                          ? "ml-6 bg-sky-500/15"
                          : "mr-6 bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                        <span>{m.senderName}</span>
                        {m.flagged && (
                          <span className="text-rose-300">{t.flagged}</span>
                        )}
                      </div>
                      <div className="mt-1 whitespace-pre-wrap text-zinc-100">
                        {m.kind === "voice"
                          ? `${t.voiceMsg}${m.durationSec ? ` ${m.durationSec}s` : ""}`
                          : m.content || "—"}
                      </div>
                      {m.translation && (
                        <div className="mt-1 text-xs text-zinc-400">
                          {m.translation}
                        </div>
                      )}
                      <div className="mt-1 text-[10px] text-zinc-500">
                        {m.createdAt?.slice(0, 19).replace("T", " ")}
                      </div>
                    </div>
                  );
                })}
                {transcript.icebreakers.length === 0 &&
                  transcript.messages.length === 0 && (
                    <div className="text-sm text-zinc-500">{t.chatsEmpty}</div>
                  )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
