"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { sampleChat } from "@/lib/mockData";
import { ChatMessage } from "@/lib/types";
import { useApp } from "@/lib/store";
import { useProfile } from "@/lib/useProfiles";
import { takeOpener } from "@/lib/openers";
import { consumeOpenerDraft } from "@/lib/datingSim";
import { isAiPersona, takeAiWelcomeReply } from "@/lib/aiPersonas";
import ImageLightbox from "@/components/ImageLightbox";
import MessageActionMenu, {
  type MessageAction,
} from "@/components/MessageActionMenu";
import { compressImageFile } from "@/lib/photoUpload";
import { useCallOptional } from "@/components/calls/CallProvider";
import { moderateContent } from "@/lib/moderation/client";
import {
  dismissChatSafetyBanner,
  isChatSafetyBannerDismissed,
  scanSafetyTip,
  safetyTipCopy,
  type SafetyHit,
} from "@/lib/safetyTip";
import { tChat } from "@/lib/chatCopy";
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
  upsertLocalConvo,
  markActiveChatPartner,
} from "@/lib/localInbox";
import { totalBadgeCount } from "@/lib/unreadBadge";

const SCAM_HARD_BLOCK = [
  "验证码发给我",
  "把验证码",
  "把密码告诉我",
  "银行卡号发给",
];

function scanHardScam(text: string) {
  const lower = text.toLowerCase();
  return SCAM_HARD_BLOCK.some((p) => lower.includes(p.toLowerCase()));
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
    openRegister,
    configured,
    userId,
    notifyPrefs,
    applyUnreadBadge,
    locale,
    isBanned,
  } = useApp();
  const chatT = tChat(locale === "en" ? "en" : "zh");
  const { profile, loading: profileLoading } = useProfile(params.id);
  const useBackend = configured && !!userId && !isAiPersona(params.id);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const welcomeFired = useRef(false);
  const callApi = useCallOptional();

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (isAiPersona(params.id)) return [];
    return isSupabaseConfigured ? [] : sampleChat;
  });
  const [input, setInput] = useState("");
  const [showTrans, setShowTrans] = useState<Record<string, boolean>>({});
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [showSafety, setShowSafety] = useState(false);
  const [scamWarn, setScamWarn] = useState(false);
  const [safetyTip, setSafetyTip] = useState<{
    hit: SafetyHit;
    text: string;
  } | null>(null);
  // AI
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [icebreakers, setIcebreakers] = useState<string[] | null>(null);
  const [polish, setPolish] = useState<{
    polished: string;
    translation: string;
  } | null>(null);
  const [correction, setCorrection] = useState<{
    original: string;
    corrected: string;
    note: string;
  } | null>(null);
  const [aiSource, setAiSource] = useState<string | null>(null);
  // Voice
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [voiceDraft, setVoiceDraft] = useState<{
    url: string;
    secs: number;
  } | null>(null);
  const [draftPlaying, setDraftPlaying] = useState(false);
  const [menuMsg, setMenuMsg] = useState<ChatMessage | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Record<string, true>>({});
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recSecsRef = useRef(0);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressMoved = useRef(false);

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
    if (!profile) return;
    markActiveChatPartner(profile.id);
    if (!isAiPersona(profile.id)) return;
    markLocalConvoRead(profile.id);
    applyUnreadBadge(totalBadgeCount());
  }, [profile, applyUnreadBadge]);

  // Top safety banner: once dismissed for this chat, stay hidden on re-entry.
  useEffect(() => {
    if (!params.id) return;
    setShowSafety(!isChatSafetyBannerDismissed(params.id));
  }, [params.id]);

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
                applyUnreadBadge(totalBadgeCount());
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

  if (profileLoading && !profile) {
    return (
      <main className="flex flex-1 items-center justify-center text-sm text-muted">
        加载中…
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex flex-1 items-center justify-center text-muted">
        会话不存在
      </main>
    );
  }

  // Soft launch: text chat after register. Flash Check is for verified badge + calls.
  if (tier === "guest" && !isAiPersona(params.id)) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <h2 className="text-xl font-bold">登录后即可聊天</h2>
        <p className="text-sm text-muted">
          注册或登录后就能和 {profile.name} 发消息。真人闪验可选，用于获得认证徽章与音视频通话。
        </p>
        <button
          onClick={() => openRegister(`和 ${profile.name} 聊天`)}
          className="btn-grad rounded-2xl px-6 py-3 font-semibold"
        >
          注册 / 登录
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
    setCorrection(null);
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

  const doCorrect = async (text: string) => {
    const t = text.trim();
    if (!t) return;
    setPolish(null);
    setIcebreakers(null);
    setAiBusy("correct");
    try {
      const data = await callAI({
        action: "correct",
        text: t,
      });
      setCorrection({
        original: t,
        corrected: data.corrected ?? data.polished ?? t,
        note: data.note ?? data.translation ?? "",
      });
      setAiSource(data.source ?? null);
    } finally {
      setAiBusy(null);
    }
  };

  const messagePreview = (m: ChatMessage) => {
    if (m.kind === "image") return locale === "en" ? "[Photo]" : "[图片]";
    if (m.kind === "video") return locale === "en" ? "[Video]" : "[视频]";
    if (m.kind === "voice") {
      return locale === "en"
        ? `[Voice ${m.durationSec ?? ""}″]`
        : `[语音 ${m.durationSec ?? ""}″]`;
    }
    return m.text;
  };

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const openMsgMenu = (m: ChatMessage) => {
    if (m.fromMe) return;
    setMenuMsg(m);
  };

  const peerPressHandlers = (m: ChatMessage) =>
    m.fromMe
      ? {}
      : {
          onContextMenu: (e: MouseEvent) => {
            e.preventDefault();
            openMsgMenu(m);
          },
          onTouchStart: () => {
            longPressMoved.current = false;
            clearLongPress();
            longPressTimer.current = setTimeout(() => {
              if (!longPressMoved.current) openMsgMenu(m);
            }, 420);
          },
          onTouchMove: () => {
            longPressMoved.current = true;
            clearLongPress();
          },
          onTouchEnd: clearLongPress,
          onTouchCancel: clearLongPress,
        };

  const onMessageAction = async (action: MessageAction) => {
    if (!menuMsg) return;
    const target = menuMsg;
    setMenuMsg(null);
    if (action === "reply") {
      setReplyTo(target);
      return;
    }
    if (action === "copy") {
      const text = messagePreview(target);
      try {
        await navigator.clipboard.writeText(text);
        showToast(chatT.copied);
      } catch {
        showToast(chatT.copied);
      }
      return;
    }
    if (action === "forward") {
      const text = messagePreview(target);
      try {
        await navigator.clipboard.writeText(text);
      } catch {}
      showToast(chatT.forwardHint);
      return;
    }
    if (action === "delete") {
      setHiddenIds((h) => ({ ...h, [target.id]: true }));
      if (replyTo?.id === target.id) setReplyTo(null);
      showToast(chatT.deleted);
    }
  };

  const onReact = (emoji: string) => {
    if (!menuMsg) return;
    const id = menuMsg.id;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, reaction: m.reaction === emoji ? null : emoji }
          : m
      )
    );
    setMenuMsg(null);
  };

  const deliverText = async (text: string) => {
    const mod = await moderateContent({ text });
    if (!mod.allowed) {
      alert(mod.reason || "内容未通过安全审核，无法发送。");
      return;
    }
    const replyPreview = replyTo ? messagePreview(replyTo) : null;
    const userMsg: ChatMessage = {
      id: `m${Date.now()}`,
      fromMe: true,
      kind: "text",
      text,
      translation: autoTranslate
        ? "（自动翻译预览：译文会显示在这里）"
        : undefined,
      time: "刚刚",
      replyPreview,
    };
    if (useBackend && conversationId) {
      const payload = replyPreview
        ? `↩️ ${replyPreview.slice(0, 80)}\n${text}`
        : text;
      dbSendMessage(conversationId, { kind: "text", content: payload }).catch(
        () => {}
      );
    } else {
      setMessages((m) => [...m, userMsg]);
    }
    setInput("");
    setReplyTo(null);
    setPolish(null);
    setIcebreakers(null);
    setSafetyTip(null);

    if (isAiPersona(params.id)) {
      requestAiReply(text);
    }
  };

  const send = async (opts?: { bypassSafety?: boolean }) => {
    if (isBanned) {
      setToast(
        locale === "en"
          ? "Account restricted — can’t send messages."
          : "账号已受限，无法发送消息。"
      );
      return;
    }
    const text = input.trim();
    if (!text) return;
    if (scanHardScam(text)) {
      setScamWarn(true);
      return;
    }
    if (!opts?.bypassSafety) {
      const hit = scanSafetyTip(text);
      if (hit) {
        setSafetyTip({ hit, text });
        return;
      }
    }
    await deliverText(text);
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
            setVoiceDraft({ url, secs });
          } catch {
            const url = URL.createObjectURL(blob);
            setVoiceDraft({ url, secs });
          }
        })();
      };
      recRef.current = mr;
      mr.start(250);
      setRecording(true);
      setVoiceDraft(null);
      setDraftPlaying(false);
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

  const discardVoiceDraft = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setDraftPlaying(false);
    setVoiceDraft(null);
  };

  const previewVoiceDraft = async () => {
    if (!voiceDraft?.url) return;
    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      if (draftPlaying) {
        setDraftPlaying(false);
        return;
      }
      const audio = new Audio(voiceDraft.url);
      audioPlayerRef.current = audio;
      setDraftPlaying(true);
      audio.onended = () => setDraftPlaying(false);
      audio.onerror = () => {
        setDraftPlaying(false);
        alert("试听失败，请重录。");
      };
      await audio.play();
    } catch {
      setDraftPlaying(false);
      alert("试听被拦截，请再点一次。");
    }
  };

  const sendVoiceDraft = () => {
    if (!voiceDraft) return;
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setDraftPlaying(false);
    setMessages((m) => [
      ...m,
      {
        id: `v${Date.now()}`,
        fromMe: true,
        kind: "voice",
        text: "[语音消息]",
        audioUrl: voiceDraft.url,
        durationSec: voiceDraft.secs,
        time: "刚刚",
      },
    ]);
    if (profile && isAiPersona(profile.id)) {
      upsertLocalConvo({
        otherId: profile.id,
        name: profile.name,
        photo: profile.photo,
        preview: "[语音]",
        unread: 0,
      });
    }
    setVoiceDraft(null);
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

  const sendMediaMessage = async (
    kind: "image" | "video",
    mediaUrl: string
  ) => {
    if (kind === "image") {
      const mod = await moderateContent({ imageDataUrl: mediaUrl });
      if (!mod.allowed) {
        alert(mod.reason || "图片未通过安全审核，无法发送。");
        return;
      }
    }
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

  const startCallFromChat = async (kind: "audio" | "video") => {
    if (!profile) return;
    if (isAiPersona(profile.id)) {
      alert("演示 AI 伙伴暂不支持真实通话");
      return;
    }
    if (!userId || !configured) {
      alert("请先登录后再通话");
      openRegister("login");
      return;
    }
    if (tier !== "verified") {
      openVerify("音视频通话");
      return;
    }
    if (!conversationId) {
      alert("请先互相接受打招呼，建立会话后再通话");
      return;
    }
    try {
      const conv = await resolveConversation(profile.id);
      if (!conv || conv.status !== "accepted") {
        alert("对方接受打招呼后才能通话");
        return;
      }
    } catch {
      /* API will re-check */
    }
    if (!callApi) {
      alert("通话组件未加载");
      return;
    }
    await callApi.startCall({
      conversationId,
      peer: {
        id: profile.id,
        name: profile.name,
        photo: profile.photo,
      },
      kind,
    });
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
          await sendMediaMessage("image", url);
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
        <button
          type="button"
          onClick={() => void startCallFromChat("audio")}
          className="shrink-0 text-sm text-muted"
          aria-label="通话"
          title="语音通话"
        >
          <svg viewBox="0 0 20 20" className="inline h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4.5A2.5 2.5 0 0 1 4.5 2h2a1 1 0 0 1 .95.68l.8 2.4a1 1 0 0 1-.27 1.02L6.7 7.38a10 10 0 0 0 5.92 5.92l1.28-1.28a1 1 0 0 1 1.02-.27l2.4.8a1 1 0 0 1 .68.95v2a2.5 2.5 0 0 1-2.5 2.5C8.6 18 2 11.4 2 4.5Z" /></svg>
        </button>
        <button
          type="button"
          onClick={() => void startCallFromChat("video")}
          className="shrink-0 text-sm text-muted"
          aria-label="视频"
          title="视频通话"
        >
          <svg viewBox="0 0 20 20" className="inline h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="16" height="12" rx="2" /><path d="m15 7 3-2v10l-3-2" /></svg>
        </button>
      </header>

      {showSafety && (
        <div className="flex shrink-0 items-start gap-2 border-b border-warn/30 bg-warn/10 px-4 py-2 text-[12px] text-warn">
          <span>⚠️</span>
          <span className="flex-1">
            安全提醒：任何要求<b>转账、汇款、投资</b>的都是诈骗。请勿在平台外私下交易。
          </span>
          <button
            type="button"
            onClick={() => {
              dismissChatSafetyBanner(params.id);
              setShowSafety(false);
            }}
            className="text-warn/70"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
      )}

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto no-scrollbar p-4"
      >
        {messages
          .filter((m) => !hiddenIds[m.id])
          .map((m) => (
          <div
            key={m.id}
            className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}
          >
            <div className="max-w-[78%] select-none">
              {m.replyPreview && (
                <div
                  className={`mb-1 rounded-xl border-l-2 border-accent/60 bg-surface px-2.5 py-1.5 text-[12px] text-muted ${
                    m.fromMe ? "ml-auto" : ""
                  }`}
                >
                  <div className="font-medium text-accent/90">{chatT.replyTo}</div>
                  <div className="line-clamp-2">{m.replyPreview}</div>
                </div>
              )}
              {m.kind === "image" && m.mediaUrl ? (
                <button
                  type="button"
                  onClick={() => setLightboxSrc(m.mediaUrl!)}
                  {...peerPressHandlers(m)}
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
                  {...peerPressHandlers(m)}
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
                  {...peerPressHandlers(m)}
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
                  {...peerPressHandlers(m)}
                  className={`rounded-2xl px-3 py-2 text-[15px] ${
                    m.fromMe
                      ? "btn-grad rounded-br-md text-white"
                      : "rounded-bl-md bg-surface-2"
                  }`}
                >
                  {m.text}
                </div>
              )}
              {m.reaction && (
                <div
                  className={`mt-[-6px] inline-flex rounded-full bg-background px-1.5 py-0.5 text-[13px] shadow-sm ring-1 ring-line ${
                    m.fromMe ? "float-right" : ""
                  }`}
                >
                  {m.reaction}
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
                {!m.fromMe && m.kind !== "voice" && m.kind !== "image" && m.kind !== "video" && (
                  <button
                    type="button"
                    disabled={aiBusy !== null}
                    onClick={() => void doCorrect(m.text)}
                  >
                    <svg viewBox="0 0 16 16" className="mr-0.5 inline h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2.5l3.5 3.5L5 14.5H1.5V11L10 2.5Z" /></svg>
                    {aiBusy === "correct" ? "纠错中…" : "纠错"}
                  </button>
                )}
                <span>{m.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {menuMsg && (
        <MessageActionMenu
          message={menuMsg}
          locale={locale === "en" ? "en" : "zh"}
          onClose={() => setMenuMsg(null)}
          onAction={onMessageAction}
          onReact={onReact}
        />
      )}

      {toast && (
        <div className="pointer-events-none fixed bottom-28 left-1/2 z-[90] -translate-x-1/2 rounded-full bg-foreground/90 px-4 py-2 text-sm text-background shadow-lg">
          {toast}
        </div>
      )}

      {/* Composer pinned to bottom (like profile「打招呼」) */}
      <div className="shrink-0 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {replyTo && (
        <div className="flex items-start gap-2 border-b border-line bg-surface-2/70 px-3 py-2">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-accent">
              {chatT.replyTo}
            </div>
            <div className="truncate text-[13px] text-muted">
              {messagePreview(replyTo)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="shrink-0 text-xs text-muted"
          >
            {chatT.cancelReply}
          </button>
        </div>
      )}
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

      {correction && (
        <div className="animate-fadeUp border-b border-line bg-surface-2/60 p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-accent">纠错建议</span>
            <button onClick={() => setCorrection(null)} className="text-muted">
              收起
            </button>
          </div>
          <p className="mb-1 text-[11px] text-muted">原文</p>
          <div className="rounded-xl border border-line bg-surface p-2.5 text-[13px] text-muted line-through decoration-rose-400/60">
            {correction.original}
          </div>
          <p className="mb-1 mt-2 text-[11px] text-muted">更自然的说法</p>
          <div className="rounded-xl border border-accent/30 bg-surface p-2.5 text-[14px]">
            {correction.corrected}
          </div>
          {correction.note && (
            <div className="mt-1 rounded-xl bg-surface px-2.5 py-1.5 text-[12px] text-muted">
              {correction.note}
            </div>
          )}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setInput(correction.corrected);
                setCorrection(null);
              }}
              className="btn-grad flex-1 rounded-lg py-2 text-sm font-medium"
            >
              填入输入框
            </button>
            <button
              type="button"
              onClick={() => setCorrection(null)}
              className="flex-1 rounded-lg border border-line py-2 text-sm text-muted"
            >
              关闭
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
          onClick={
            recording
              ? stopRecording
              : voiceDraft
                ? () => {
                    discardVoiceDraft();
                    void startRecording();
                  }
                : startRecording
          }
          disabled={mediaBusy}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
            recording ? "bg-danger text-white" : "bg-surface-2 text-muted"
          }`}
          title={
            recording
              ? "停止录音"
              : voiceDraft
                ? "重录"
                : "录音（停后可试听再发送）"
          }
        >
          {recording ? "■" : <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="6" height="10" rx="3" /><path d="M4 9a6 6 0 0 0 12 0" /><path d="M10 15v3" /><path d="M7 18h6" /></svg>}
        </button>

        <div className="relative shrink-0">
          <button
            type="button"
            disabled={recording || mediaBusy || !!voiceDraft}
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
            <span className="truncate">录音中 {recSecs}″ · 再点停止</span>
          </div>
        ) : voiceDraft ? (
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <button
              type="button"
              onClick={previewVoiceDraft}
              className="flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-accent/15 px-3 text-sm font-medium text-accent"
            >
              {draftPlaying ? "❚❚ 暂停" : "▶ 试听"}
              <span className="text-xs opacity-80">{voiceDraft.secs}″</span>
            </button>
            <button
              type="button"
              onClick={discardVoiceDraft}
              className="h-10 shrink-0 rounded-full border border-line px-3 text-xs text-muted"
            >
              重录
            </button>
            <button
              type="button"
              onClick={sendVoiceDraft}
              className="btn-grad h-10 shrink-0 rounded-full px-3.5 text-sm font-semibold"
            >
              发送
            </button>
          </div>
        ) : (
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void send()}
            placeholder="说点什么…"
            className="min-w-0 flex-1 rounded-full border border-line bg-surface-2 px-3 py-2 outline-none focus:border-accent"
          />
        )}
        {!voiceDraft && (
          <button
            onClick={() => void send()}
            disabled={recording || mediaBusy}
            className="btn-grad h-10 w-10 shrink-0 rounded-full text-lg font-bold disabled:opacity-40"
          >
            ↑
          </button>
        )}
      </div>
      </div>

      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}

      {safetyTip && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSafetyTip(null)}
            aria-hidden
          />
          <div className="animate-fadeUp relative w-full max-w-md rounded-t-3xl border border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-warn/15 text-warn">
              <svg
                viewBox="0 0 48 48"
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M24 4 2 42h44L24 4Z" />
                <path d="M24 18v10" />
                <circle cx="24" cy="34" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <h3 className="text-center text-lg font-bold">
              {safetyTipCopy(safetyTip.hit).title}
            </h3>
            <p className="mt-2 text-center text-sm leading-relaxed text-muted">
              {safetyTipCopy(safetyTip.hit).body}
            </p>
            {safetyTip.hit.labels.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {safetyTip.hit.labels.map((l) => (
                  <span
                    key={l}
                    className="rounded-full bg-warn/10 px-2.5 py-0.5 text-[11px] font-medium text-warn"
                  >
                    {l}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-center text-[12px] text-muted">
              TalkLov 不会要求你转账或投资。保护好自己的钱和隐私。
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setSafetyTip(null)}
                className="btn-grad w-full rounded-xl py-3 text-sm font-semibold"
              >
                返回修改
              </button>
              <button
                type="button"
                onClick={() => void send({ bypassSafety: true })}
                className="w-full rounded-xl border border-line py-3 text-sm text-muted"
              >
                我了解风险，仍要发送
              </button>
            </div>
          </div>
        </div>
      )}

      {scamWarn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setScamWarn(false)}
          />
          <div className="animate-fadeUp relative w-full max-w-sm rounded-2xl border border-danger/40 bg-surface p-5 text-center">
            <svg viewBox="0 0 48 48" className="mx-auto h-10 w-10 text-danger" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M24 4 2 42h44L24 4Z" /><path d="M24 18v10" /><circle cx="24" cy="34" r="1.5" fill="currentColor" stroke="none" /></svg>
            <h3 className="mt-2 text-lg font-bold text-danger">
              已拦截高风险内容
            </h3>
            <p className="mt-1 text-sm text-muted">
              索要验证码或密码的消息已被拦截。任何要你交出账号验证码的人都可能是骗子。
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
                清空并关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
