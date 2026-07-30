"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { sampleChat } from "@/lib/mockData";
import { ChatMessage } from "@/lib/types";
import { useApp } from "@/lib/store";
import { useProfile } from "@/lib/useProfiles";
import { takeOpener } from "@/lib/openers";
import { consumeOpenerDraft } from "@/lib/datingSim";
import { isAiPersona, takeAiWelcomeReply } from "@/lib/aiPersonas";
import { compressImageFile } from "@/lib/photoUpload";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  resolveConversation,
  fetchMessages,
  sendMessage as dbSendMessage,
  subscribeMessages,
} from "@/lib/db";
import {
  playMessageSound,
  showLocalMessageNotification,
} from "@/lib/notify";
import {
  markLocalConvoRead,
  totalUnread,
  upsertLocalConvo,
} from "@/lib/localInbox";

const SCAM_PATTERNS = [
  "转账", "汇款", "打钱", "投资", "比特币", "bitcoin", "wire", "money",
  "加我微信", "加微信", "whatsapp", "telegram", "验证码", "银行卡",
];

function scanScam(text: string) {
  const lower = text.toLowerCase();
  return SCAM_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

function speak(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = /[\u4e00-\u9fa5]/.test(text) ? "zh-CN" : "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {}
}

export default function Chat() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    tier,
    myProfile,
    openVerify,
    configured,
    userId,
    notifyPrefs,
    applyUnreadBadge,
  } = useApp();
  const { profile } = useProfile(params.id);
  const useBackend = configured && !!userId && !isAiPersona(params.id);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const welcomeFired = useRef(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (isAiPersona(params.id)) return [];
    return isSupabaseConfigured ? [] : sampleChat;
  });
  const [input, setInput] = useState("");
  const [showTrans, setShowTrans] = useState<Record<string, boolean>>({});
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [showSafety, setShowSafety] = useState(true);
  const [scamWarn, setScamWarn] = useState(false);
  // AI
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [icebreakers, setIcebreakers] = useState<string[] | null>(null);
  const [polish, setPolish] = useState<{
    polished: string;
    translation: string;
  } | null>(null);
  const [aiSource, setAiSource] = useState<string | null>(null);
  // Voice
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recSecsRef = useRef(0);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  function pickRecorderMime(): string | undefined {
    if (typeof MediaRecorder === "undefined") return undefined;
    const candidates = [
      "audio/mp4",
      "audio/aac",
      "audio/webm;codecs=opus",
      "audio/webm",
    ];
    return candidates.find((t) => MediaRecorder.isTypeSupported(t));
  }

  function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  // Opening an AI chat clears unread on the messages list / home badge
  useEffect(() => {
    if (!profile || !isAiPersona(profile.id)) return;
    markLocalConvoRead(profile.id);
    applyUnreadBadge(totalUnread());
  }, [profile, applyUnreadBadge]);

  // Seed opener from profile hello, and/or AI practice draft into composer.
  // AI personas: after opener, auto-request a welcome reply once.
  useEffect(() => {
    if (!profile) return;
    if (!useBackend) {
      const o = takeOpener(profile.id);
      const welcome = isAiPersona(profile.id)
        ? takeAiWelcomeReply(profile.id)
        : null;
      const openerText = o || welcome?.opener || null;
      if (openerText) {
        setMessages([
          {
            id: `opener-${Date.now()}`,
            fromMe: true,
            kind: "text",
            text: openerText,
            translation: autoTranslate ? "（自动翻译预览）" : undefined,
            time: "刚刚",
          },
        ]);
        if (isAiPersona(profile.id) && !welcomeFired.current) {
          welcomeFired.current = true;
          void (async () => {
            try {
              const res = await fetch("/api/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "chat_reply",
                  persona: profile.id,
                  chatHistory: [
                    { role: "user", text: openerText },
                  ],
                }),
              });
              const data = await res.json();
              if (!data.reply) return;
              window.setTimeout(() => {
                const reply = data.reply as string;
                setMessages((m) => [
                  ...m,
                  {
                    id: `ai-welcome-${Date.now()}`,
                    fromMe: false,
                    kind: "text",
                    text: reply,
                    time: "刚刚",
                  },
                ]);
                upsertLocalConvo({
                  otherId: profile.id,
                  name: profile.name,
                  photo: profile.photo,
                  preview: reply,
                  unread: 0,
                });
                applyUnreadBadge(totalUnread());
                playMessageSound(notifyPrefs.sound);
                showLocalMessageNotification(
                  profile.name,
                  reply,
                  notifyPrefs.push,
                  `/chat/${profile.id}`
                );
              }, 700 + Math.random() * 900);
            } catch {
              /* ignore */
            }
          })();
        }
      }
    }
    const practice = consumeOpenerDraft();
    if (practice) setInput(practice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, useBackend]);

  // Backend mode: load the real conversation + subscribe to Realtime inserts.
  useEffect(() => {
    if (!useBackend || !profile || !userId) return;
    let unsub = () => {};
    let cancelled = false;
    (async () => {
      try {
        const conv = await resolveConversation(profile.id);
        if (!conv || cancelled) return;
        setConversationId(conv.id);
        if (conv.status === "accepted") {
          const msgs = await fetchMessages(conv.id, userId);
          if (!cancelled) setMessages(msgs);
          unsub = subscribeMessages(conv.id, userId, (m) =>
            setMessages((prev) =>
              prev.some((x) => x.id === m.id) ? prev : [...prev, m]
            )
          );
        }
      } catch {
        // stay on whatever is loaded
      }
    })();
    return () => {
      cancelled = true;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useBackend, profile?.id, userId]);

  // Auto-scroll to newest
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  if (!profile) {
    return (
      <main className="flex flex-1 items-center justify-center text-muted">
        会话不存在
      </main>
    );
  }

  if (tier !== "verified" && !isAiPersona(params.id)) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <svg viewBox="0 0 48 48" className="h-12 w-12 text-muted" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M24 4 6 12v12c0 11 18 18 18 18s18-7 18-18V12L24 4Z" /></svg>
        <h2 className="text-xl font-bold">聊天前需要真人认证</h2>
        <p className="text-sm text-muted">
          为防止骗子与虚假账号，进入会话前请先完成真人核验（自拍活体，不采集证件实名）。
        </p>
        <button
          onClick={() => openVerify(`和 ${profile.name} 聊天`)}
          className="btn-grad rounded-2xl px-6 py-3 font-semibold"
        >
          去认证
        </button>
        <button onClick={() => router.back()} className="text-sm text-muted">
          返回
        </button>
      </main>
    );
  }

  async function callAI(payload: Record<string, unknown>) {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  const fetchIcebreakers = async () => {
    setPolish(null);
    setAiBusy("icebreakers");
    try {
      const data = await callAI({
        action: "icebreakers",
        profile: {
          name: profile.name,
          interests: profile.interests,
          nativeLang: profile.nativeLang,
          learningLang: profile.learningLang,
        },
      });
      setIcebreakers(data.suggestions ?? []);
      setAiSource(data.source ?? null);
    } finally {
      setAiBusy(null);
    }
  };

  const doPolish = async () => {
    if (!input.trim()) return;
    setIcebreakers(null);
    setAiBusy("polish");
    try {
      const data = await callAI({
        action: "polish",
        text: input.trim(),
        tone: "friendly",
      });
      setPolish({ polished: data.polished, translation: data.translation });
      setAiSource(data.source ?? null);
    } finally {
      setAiBusy(null);
    }
  };

  const send = () => {
    const text = input.trim();
    if (!text) return;
    if (scanScam(text)) {
      setScamWarn(true);
      return;
    }
    const userMsg: ChatMessage = {
      id: `m${Date.now()}`,
      fromMe: true,
      kind: "text",
      text,
      translation: autoTranslate
        ? "（自动翻译预览：译文会显示在这里）"
        : undefined,
      time: "刚刚",
    };
    if (useBackend && conversationId) {
      dbSendMessage(conversationId, { kind: "text", content: text }).catch(
        () => {}
      );
    } else {
      setMessages((m) => [...m, userMsg]);
    }
    setInput("");
    setPolish(null);
    setIcebreakers(null);

    if (isAiPersona(params.id)) {
      requestAiReply(text);
    }
  };

  const requestAiReply = async (lastUserText: string) => {
    const recentHistory = [...messages.slice(-10), { id: "_", fromMe: true, kind: "text" as const, text: lastUserText, time: "" }]
      .map((m) => ({ role: (m.fromMe ? "user" : "them") as "user" | "them", text: m.text }));
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat_reply",
          persona: params.id,
          chatHistory: recentHistory,
        }),
      });
      const data = await res.json();
      if (data.reply && profile) {
        setTimeout(() => {
          const reply = data.reply as string;
          setMessages((m) => [
            ...m,
            {
              id: `ai-${Date.now()}`,
              fromMe: false,
              kind: "text",
              text: reply,
              time: "刚刚",
            },
          ]);
          upsertLocalConvo({
            otherId: profile.id,
            name: profile.name,
            photo: profile.photo,
            preview: reply,
            unread: 0,
          });
        }, 800 + Math.random() * 1200);
      }
    } catch {}
  };

  // --- Speech to text (voice input) ---
  const startVoiceInput = () => {
    const SR =
      (window as unknown as { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown })
        .webkitSpeechRecognition;
    if (!SR) {
      alert("当前浏览器不支持语音输入，请用 Chrome / Edge 试试。");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new (SR as any)();
    rec.lang = myProfile.nativeLang === "English" ? "en-US" : "zh-CN";
    rec.interimResults = true;
    rec.continuous = false;
    setListening(true);
    let finalText = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setInput((finalText + interim).trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  };

  // --- Record & send a voice message ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      const mime = pickRecorderMime();
      const mr = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const type = mr.mimeType || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const secs = recSecsRef.current;
        stream.getTracks().forEach((t) => t.stop());
        if (!blob.size) {
          alert("没录到声音，请按住再试一次。");
          return;
        }
        void (async () => {
          try {
            // data URL plays more reliably than blob: on iOS Safari / PWA
            const url = await blobToDataUrl(blob);
            setMessages((m) => [
              ...m,
              {
                id: `v${Date.now()}`,
                fromMe: true,
                kind: "voice",
                text: "[语音消息]",
                audioUrl: url,
                durationSec: secs,
                time: "刚刚",
              },
            ]);
          } catch {
            const url = URL.createObjectURL(blob);
            setMessages((m) => [
              ...m,
              {
                id: `v${Date.now()}`,
                fromMe: true,
                kind: "voice",
                text: "[语音消息]",
                audioUrl: url,
                durationSec: secs,
                time: "刚刚",
              },
            ]);
          }
        })();
      };
      recRef.current = mr;
      mr.start(250);
      setRecording(true);
      setRecSecs(0);
      recSecsRef.current = 0;
      recTimer.current = setInterval(() => {
        recSecsRef.current += 1;
        setRecSecs(recSecsRef.current);
      }, 1000);
    } catch {
      alert("无法访问麦克风，请检查浏览器权限。");
    }
  };

  const stopRecording = () => {
    if (recRef.current && recRef.current.state !== "inactive") {
      recRef.current.stop();
    }
    setRecording(false);
    if (recTimer.current) clearInterval(recTimer.current);
  };

  const playAudio = async (id: string, url?: string) => {
    if (!url) {
      alert("这条语音还不能播放。");
      return;
    }
    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      if (playingId === id) {
        setPlayingId(null);
        return;
      }
      const audio = new Audio(url);
      audioPlayerRef.current = audio;
      setPlayingId(id);
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => {
        setPlayingId(null);
        alert("语音播放失败，请再录一条试试。");
      };
      await audio.play();
    } catch {
      setPlayingId(null);
      alert("语音播放被拦截，请再点一次，或检查静音开关。");
    }
  };

  const sendMediaMessage = (kind: "image" | "video", mediaUrl: string) => {
    const userMsg: ChatMessage = {
      id: `m${Date.now()}`,
      fromMe: true,
      kind,
      text: kind === "image" ? "[图片]" : "[视频]",
      mediaUrl,
      time: "刚刚",
    };
    setMessages((m) => [...m, userMsg]);
    if (profile && isAiPersona(profile.id)) {
      upsertLocalConvo({
        otherId: profile.id,
        name: profile.name,
        photo: profile.photo,
        preview: kind === "image" ? "[图片]" : "[视频]",
        unread: 0,
      });
    }
  };

  const onPickImages = async (files: FileList | null) => {
    setAttachOpen(false);
    if (!files?.length) return;
    setMediaBusy(true);
    try {
      for (const file of Array.from(files).slice(0, 9)) {
        if (!file.type.startsWith("image/")) continue;
        try {
          const url = await compressImageFile(file);
          sendMediaMessage("image", url);
        } catch {
          /* skip */
        }
      }
    } finally {
      setMediaBusy(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const onPickVideos = async (files: FileList | null) => {
    setAttachOpen(false);
    if (!files?.length) return;
    const file = files[0];
    if (!file?.type.startsWith("video/")) {
      alert("请选择视频文件。");
      return;
    }
    // Soft limit for demo / local storage friendliness
    if (file.size > 40 * 1024 * 1024) {
      alert("视频请控制在 40MB 以内（演示版）。");
      return;
    }
    setMediaBusy(true);
    try {
      const url = URL.createObjectURL(file);
      sendMediaMessage("video", url);
    } finally {
      setMediaBusy(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-20 flex shrink-0 items-center gap-2.5 border-b border-line bg-surface/95 px-3 py-2 backdrop-blur">
        <button
          type="button"
          onClick={() => router.back()}
          className="shrink-0 px-1 text-xl"
          aria-label="返回"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => router.push(`/profile/${profile.id}`)}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <div
            className="h-9 w-9 shrink-0 rounded-full bg-cover bg-center bg-surface-2"
            style={{ backgroundImage: `url(${profile.photo})` }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 truncate font-semibold">
              {profile.name}
              {profile.verified && (
                <span className="text-xs text-accent-2">✓</span>
              )}
            </div>
            <div className="truncate text-[11px] text-muted">
              {profile.nativeLang}
              {profile.chineseVariants?.length
                ? ` · ${profile.chineseVariants
                    .map((v) => (v === "cantonese" ? "粤语" : "普通话"))
                    .join("/")} `
                : ""}
              {" · "}
              {profile.online ? "在线" : "离线"}
            </div>
          </div>
        </button>
        <button type="button" className="shrink-0 text-sm text-muted" aria-label="通话">
          <svg viewBox="0 0 20 20" className="inline h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4.5A2.5 2.5 0 0 1 4.5 2h2a1 1 0 0 1 .95.68l.8 2.4a1 1 0 0 1-.27 1.02L6.7 7.38a10 10 0 0 0 5.92 5.92l1.28-1.28a1 1 0 0 1 1.02-.27l2.4.8a1 1 0 0 1 .68.95v2a2.5 2.5 0 0 1-2.5 2.5C8.6 18 2 11.4 2 4.5Z" /></svg>
        </button>
        <button type="button" className="shrink-0 text-sm text-muted" aria-label="视频">
          <svg viewBox="0 0 20 20" className="inline h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="16" height="12" rx="2" /><path d="m15 7 3-2v10l-3-2" /></svg>
        </button>
      </header>

      {showSafety && (
        <div className="flex shrink-0 items-start gap-2 border-b border-warn/30 bg-warn/10 px-4 py-2 text-[12px] text-warn">
          <span>⚠️</span>
          <span className="flex-1">
            安全提醒：任何要求<b>转账、汇款、投资</b>的都是诈骗。请勿在平台外私下交易。
          </span>
          <button onClick={() => setShowSafety(false)} className="text-warn/70">
            ✕
          </button>
        </div>
      )}

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto no-scrollbar p-4"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}
          >
            <div className="max-w-[78%]">
              {m.kind === "image" && m.mediaUrl ? (
                <button
                  type="button"
                  onClick={() => window.open(m.mediaUrl, "_blank")}
                  className={`overflow-hidden rounded-2xl ${
                    m.fromMe ? "rounded-br-md" : "rounded-bl-md"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.mediaUrl}
                    alt="图片"
                    className="max-h-64 max-w-full object-cover"
                  />
                </button>
              ) : m.kind === "video" && m.mediaUrl ? (
                <div
                  className={`overflow-hidden rounded-2xl ${
                    m.fromMe ? "rounded-br-md" : "rounded-bl-md"
                  }`}
                >
                  <video
                    src={m.mediaUrl}
                    controls
                    playsInline
                    className="max-h-64 max-w-full bg-black"
                  />
                </div>
              ) : m.kind === "voice" ? (
                <button
                  type="button"
                  onClick={() => playAudio(m.id, m.audioUrl)}
                  className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-[15px] ${
                    m.fromMe
                      ? "btn-grad rounded-br-md text-white"
                      : "rounded-bl-md bg-surface-2"
                  }`}
                >
                  {playingId === m.id ? "❚❚" : "▶"}{" "}
                  <span className="text-sm">语音</span>
                  <span className="opacity-80">
                    {m.durationSec ? `${m.durationSec}″` : ""}
                  </span>
                  <span className="ml-1 flex items-end gap-0.5">
                    {[6, 10, 7, 12, 8].map((h, i) => (
                      <span
                        key={i}
                        className={`w-0.5 rounded-full ${
                          m.fromMe ? "bg-white/80" : "bg-muted"
                        }`}
                        style={{ height: h }}
                      />
                    ))}
                  </span>
                </button>
              ) : (
                <div
                  className={`rounded-2xl px-3 py-2 text-[15px] ${
                    m.fromMe
                      ? "btn-grad rounded-br-md text-white"
                      : "rounded-bl-md bg-surface-2"
                  }`}
                >
                  {m.text}
                </div>
              )}
              {m.translation && showTrans[m.id] && (
                <div className="mt-1 rounded-xl bg-surface px-3 py-1.5 text-[13px] text-muted">
                  {m.translation}
                </div>
              )}
              <div
                className={`mt-1 flex items-center gap-3 text-[11px] text-muted ${
                  m.fromMe ? "justify-end" : "justify-start"
                }`}
              >
                {m.translation && (
                  <button
                    onClick={() =>
                      setShowTrans((s) => ({ ...s, [m.id]: !s[m.id] }))
                    }
                  >
                    <svg viewBox="0 0 16 16" className="mr-0.5 inline h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="6.5" /><path d="M1.5 8h13M8 1.5a10 10 0 0 1 2.5 6.5 10 10 0 0 1-2.5 6.5 10 10 0 0 1-2.5-6.5A10 10 0 0 1 8 1.5Z" /></svg>{showTrans[m.id] ? "隐藏翻译" : "翻译"}
                  </button>
                )}
                {m.kind !== "voice" && m.kind !== "image" && m.kind !== "video" && (
                  <button onClick={() => speak(m.text)}><svg viewBox="0 0 16 16" className="mr-0.5 inline h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h2l4-3v10L5 10H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" /><path d="M11 5.5a3.5 3.5 0 0 1 0 5" /></svg>朗读</button>
                )}
                {!m.fromMe && m.kind !== "voice" && m.kind !== "image" && m.kind !== "video" && <button><svg viewBox="0 0 16 16" className="mr-0.5 inline h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2.5l3.5 3.5L5 14.5H1.5V11L10 2.5Z" /></svg>纠错</button>}
                <span>{m.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Composer pinned to bottom (like profile「打招呼」) */}
      <div className="shrink-0 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {icebreakers && (
        <div className="animate-fadeUp border-b border-line bg-surface-2/60 p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-accent">AI 破冰话题</span>
            <button onClick={() => setIcebreakers(null)} className="text-muted">
              收起
            </button>
          </div>
          <div className="space-y-2">
            {icebreakers.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(s);
                  setIcebreakers(null);
                }}
                className="block w-full rounded-xl border border-line bg-surface p-2.5 text-left text-[13px] leading-snug active:bg-surface-2"
              >
                {s}
              </button>
            ))}
          </div>
          {aiSource?.startsWith("fallback") && (
            <p className="mt-2 text-[11px] text-muted">
              （示例内容；在 web/.env.local 配置 AI_API_KEY 后由真实模型生成）
            </p>
          )}
        </div>
      )}

      {polish && (
        <div className="animate-fadeUp border-b border-line bg-surface-2/60 p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-accent">润色建议</span>
            <button onClick={() => setPolish(null)} className="text-muted">
              收起
            </button>
          </div>
          <div className="rounded-xl border border-line bg-surface p-2.5 text-[14px]">
            {polish.polished}
          </div>
          {polish.translation && (
            <div className="mt-1 rounded-xl bg-surface px-2.5 py-1.5 text-[12px] text-muted">
              {polish.translation}
            </div>
          )}
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                setInput(polish.polished);
                setPolish(null);
              }}
              className="btn-grad flex-1 rounded-lg py-2 text-sm font-medium"
            >
              用润色版
            </button>
            <button
              onClick={() => setPolish(null)}
              className="flex-1 rounded-lg border border-line py-2 text-sm text-muted"
            >
              保持原文
            </button>
          </div>
        </div>
      )}

      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-3 py-1.5 text-xs">
        <button
          onClick={() => setAutoTranslate((v) => !v)}
          className={`whitespace-nowrap rounded-full px-3 py-1 ${
            autoTranslate ? "bg-accent/15 text-accent" : "bg-surface-2 text-muted"
          }`}
        >
          自动翻译 {autoTranslate ? "开" : "关"}
        </button>
        <button
          onClick={fetchIcebreakers}
          disabled={aiBusy !== null}
          className="whitespace-nowrap rounded-full bg-surface-2 px-3 py-1 text-muted disabled:opacity-50"
        >
          {aiBusy === "icebreakers" ? "生成中…" : "AI 破冰"}
        </button>
        <button
          onClick={doPolish}
          disabled={aiBusy !== null || !input.trim()}
          className="whitespace-nowrap rounded-full bg-surface-2 px-3 py-1 text-muted disabled:opacity-50"
        >
          {aiBusy === "polish" ? "润色中…" : "AI 润色"}
        </button>
        <button
          onClick={startVoiceInput}
          className={`whitespace-nowrap rounded-full px-3 py-1 ${
            listening ? "bg-accent/15 text-accent" : "bg-surface-2 text-muted"
          }`}
        >
          {listening ? "聆听中…" : "语音输入"}
        </button>
      </div>

      <div className="relative flex min-w-0 items-center gap-1.5 px-2.5 pb-3 pt-1">
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={mediaBusy}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
            recording ? "bg-danger text-white" : "bg-surface-2 text-muted"
          }`}
          title="按一下开始录音，再按一下发送语音"
        >
          {recording ? "■" : <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="6" height="10" rx="3" /><path d="M4 9a6 6 0 0 0 12 0" /><path d="M10 15v3" /><path d="M7 18h6" /></svg>}
        </button>

        <div className="relative shrink-0">
          <button
            type="button"
            disabled={recording || mediaBusy}
            onClick={() => setAttachOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-xl font-light leading-none text-muted disabled:opacity-40"
            title="发送照片或视频"
            aria-label="添加照片或视频"
          >
            {mediaBusy ? "…" : "+"}
          </button>
          {attachOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-30 cursor-default"
                aria-label="关闭"
                onClick={() => setAttachOpen(false)}
              />
              <div className="absolute bottom-[2.85rem] left-0 z-40 w-36 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_12px_40px_rgba(40,20,60,0.18)]">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm active:bg-surface-2"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <circle cx="8.5" cy="10" r="1.5" />
                    <path d="m21 15-4.5-4.5L9 18" />
                  </svg>
                  照片
                </button>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="flex w-full items-center gap-2 border-t border-line px-3 py-2.5 text-left text-sm active:bg-surface-2"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <rect x="3" y="6" width="13" height="12" rx="2" />
                    <path d="m16 10 5-3v10l-5-3" />
                  </svg>
                  视频
                </button>
              </div>
            </>
          )}
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onPickImages(e.target.files)}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => onPickVideos(e.target.files)}
        />

        {recording ? (
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-danger/10 px-3 py-2 text-sm text-danger">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-danger" />
            <span className="truncate">录音中 {recSecs}″</span>
          </div>
        ) : (
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="说点什么…"
            className="min-w-0 flex-1 rounded-full border border-line bg-surface-2 px-3 py-2 outline-none focus:border-accent"
          />
        )}
        <button
          onClick={send}
          disabled={recording || mediaBusy}
          className="btn-grad h-10 w-10 shrink-0 rounded-full text-lg font-bold disabled:opacity-40"
        >
          ↑
        </button>
      </div>
      </div>

      {scamWarn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setScamWarn(false)}
          />
          <div className="animate-fadeUp relative w-full max-w-sm rounded-2xl border border-danger/40 bg-surface p-5 text-center">
            <svg viewBox="0 0 48 48" className="mx-auto h-10 w-10 text-danger" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M24 4 2 42h44L24 4Z" /><path d="M24 18v10" /><circle cx="24" cy="34" r="1.5" fill="currentColor" stroke="none" /></svg>
            <h3 className="mt-2 text-lg font-bold text-danger">
              检测到高风险内容
            </h3>
            <p className="mt-1 text-sm text-muted">
              你的消息包含涉及金钱/转账的敏感词。为保护你，我们拦截了这条消息。
              涉及钱财的请求几乎都是诈骗。
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setScamWarn(false)}
                className="flex-1 rounded-xl border border-line py-2.5 text-sm"
              >
                我知道了
              </button>
              <button
                onClick={() => {
                  setScamWarn(false);
                  setInput("");
                }}
                className="flex-1 rounded-xl bg-danger/90 py-2.5 text-sm text-white"
              >
                举报对方
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
