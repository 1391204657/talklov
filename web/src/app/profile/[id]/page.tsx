"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { useProfile } from "@/lib/useProfiles";
import { saveOpener } from "@/lib/openers";
import { sendIcebreaker, countOpenersToday } from "@/lib/db";
import { isUuid } from "@/lib/useProfiles";
import {
  DAILY_OPENER_LIMIT,
  incrementOpenerToday,
  isRateLimited,
  openersLeftToday,
} from "@/lib/quota";
import {
  AI_AUTO_ACCEPT_SECONDS,
  isAiPersona,
  markAiWelcomeReply,
} from "@/lib/aiPersonas";
import {
  playMessageSound,
  showLocalMessageNotification,
} from "@/lib/notify";
import ProfilePhoto from "@/components/ProfilePhoto";
import VoicePlayButton from "@/components/VoicePlayButton";
import { formatChineseVariants, shortLevel } from "@/lib/profile";

const intentLabel: Record<string, string> = {
  language: "语伴",
  friends: "交友",
  romance: "缘分",
};

type HelloState = "idle" | "composing" | "queued" | "accepted";

export default function ProfileDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    tier,
    myProfile,
    pendingHelloId,
    openRegister,
    openVerify,
    clearPendingHello,
    configured,
    userId,
    notifyPrefs,
  } = useApp();
  const [hello, setHello] = useState<HelloState>("idle");
  const [opener, setOpener] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[] | null>(null);
  const [dbOpenerCount, setDbOpenerCount] = useState<number | null>(null);
  const [waitLeft, setWaitLeft] = useState<number | null>(null);
  const sentOpenerRef = useRef("");

  const { profile, loading, isMe } = useProfile(params.id);

  // Protected bidirectional model: the FIRST contact is always a single
  // opener that the recipient must accept. Rate limit applies to free men.
  const rateLimited = isRateLimited(myProfile.gender, tier);
  // Backend counts openers from the DB; offline uses localStorage.
  const left =
    configured && userId
      ? rateLimited
        ? Math.max(0, DAILY_OPENER_LIMIT - (dbOpenerCount ?? 0))
        : Infinity
      : openersLeftToday(myProfile.gender, tier);

  useEffect(() => {
    if (configured && userId && rateLimited) {
      countOpenersToday()
        .then(setDbOpenerCount)
        .catch(() => setDbOpenerCount(0));
    }
  }, [configured, userId, rateLimited]);

  // Demo AI partners (美琪 / Jack): auto-accept after ~10s + notify + welcome reply flag
  useEffect(() => {
    if (hello !== "queued" || !profile || !isAiPersona(profile.id)) return;

    setWaitLeft(AI_AUTO_ACCEPT_SECONDS);
    const tick = window.setInterval(() => {
      setWaitLeft((s) => (s == null || s <= 1 ? 0 : s - 1));
    }, 1000);

    const acceptTimer = window.setTimeout(() => {
      setHello("accepted");
      setWaitLeft(null);
      markAiWelcomeReply(profile.id, sentOpenerRef.current);
      playMessageSound(notifyPrefs.sound);
      const body =
        profile.id === "mei"
          ? "嗨！我看到你的打招呼啦，很高兴认识你～"
          : "Hey! Just accepted your hello — nice to meet you!";
      showLocalMessageNotification(
        `${profile.name} 已接受你的打招呼`,
        body,
        notifyPrefs.push
      );
    }, AI_AUTO_ACCEPT_SECONDS * 1000);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(acceptTimer);
    };
  }, [hello, profile, notifyPrefs.sound, notifyPrefs.push]);

  if (!profile) {
    return (
      <main className="flex flex-1 items-center justify-center text-muted">
        {loading ? "加载中…" : "没有找到这个人"}
      </main>
    );
  }

  // Derived view: right after registration we auto-open the opener composer
  // (so the user lands back on this person and can immediately write a message).
  const view: HelloState =
    hello === "idle" && tier !== "guest" && pendingHelloId === profile.id
      ? "composing"
      : hello;

  const onSayHello = () => {
    if (tier === "guest") {
      openRegister(`给 ${profile.name} 打招呼`, profile.id);
      return;
    }
    setHello("composing");
  };

  const fetchAiIcebreakers = async () => {
    setAiBusy(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "icebreakers",
          profile: {
            name: profile.name,
            interests: profile.interests,
            nativeLang: profile.nativeLang,
            learningLang: profile.learningLang,
          },
        }),
      });
      const data = await res.json();
      setAiSuggestions(data.suggestions ?? []);
    } catch {
      setAiSuggestions([]);
    } finally {
      setAiBusy(false);
    }
  };

  const sendOpener = () => {
    const text = opener.trim();
    if (!text) return;
    if (rateLimited && left <= 0) return; // quota guard
    sentOpenerRef.current = text;
    // AI demo personas always use local opener flow (ids are mei/jack, not UUIDs)
    if (configured && userId && isUuid(profile.id) && !isAiPersona(profile.id)) {
      sendIcebreaker(profile.id, text).catch(() => {});
      if (rateLimited) setDbOpenerCount((c) => (c ?? 0) + 1);
    } else {
      saveOpener(profile.id, text);
      if (rateLimited) incrementOpenerToday();
    }
    clearPendingHello();
    setHello("queued");
  };

  const onEnterChat = () => {
    // Demo AI partners skip liveness gate so testers can chat immediately
    if (tier !== "verified" && !isAiPersona(profile.id)) {
      openVerify(`和 ${profile.name} 聊天`);
      return;
    }
    router.push(`/chat/${profile.id}`);
  };

  return (
    <main className="flex flex-1 flex-col">
      {/* Photo hero — figure-2 style: bottom rounded, no fade gradient */}
      <div className="relative px-3 pt-2">
        <div className="relative overflow-hidden rounded-b-[1.75rem] rounded-t-[1.1rem] shadow-[0_12px_40px_rgba(160,120,180,0.18)]">
          <ProfilePhoto
            profile={profile}
            className="aspect-[4/5] w-full"
            rounded="rounded-none"
            showWatermark={false}
            segments="bottom"
          />
          <button
            onClick={() => router.back()}
            className="absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md"
            aria-label="返回"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 5 8 12l7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <VoicePlayButton
            profile={profile}
            className="absolute bottom-9 right-3.5"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-10 pt-5 pr-14">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className="text-[1.65rem] font-bold tracking-wide text-white"
                style={{ textShadow: "0 2px 12px rgba(0,0,0,0.45)" }}
              >
                {profile.name}
              </h1>
              <span
                className="text-lg text-white/90"
                style={{ textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}
              >
                {profile.age}
              </span>
              <span className="text-sm">{profile.country === "CN" ? "🇨🇳" : "🇺🇸"}</span>
              {profile.verified && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-accent-2/90 px-2 py-0.5 text-[11px] text-white backdrop-blur-md">
                  <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <circle cx="8" cy="8" r="6" />
                    <path d="m5.2 8.2 1.8 1.8 3.8-3.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  已认证
                </span>
              )}
            </div>
            <div
              className="mt-1 text-sm text-white/90"
              style={{ textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}
            >
              {profile.city}
              <span className="mx-1.5 opacity-50">·</span>
              {profile.online ? (
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  在线
                </span>
              ) : (
                "最近活跃"
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-4 p-5">
        {/* Language row — one elegant line */}
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface/80 px-3.5 py-3.5 backdrop-blur-md">
          <div className="min-w-0 flex-1 text-center">
            <div className="text-[11px] text-muted">母语</div>
            <div className="mt-0.5 truncate text-[15px] font-semibold">
              {formatChineseVariants(profile.chineseVariants) ||
                profile.nativeLang}
            </div>
          </div>
          <span className="shrink-0 text-lg font-medium text-accent" aria-hidden>
            ⇄
          </span>
          <div className="min-w-0 flex-1 text-center">
            <div className="text-[11px] text-muted">在学</div>
            <div className="mt-0.5 truncate text-[15px] font-semibold">
              {profile.learningLang}
              {profile.level ? (
                <span className="font-normal text-muted">
                  （{shortLevel(profile.level)}）
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-1 text-sm text-muted">意图</div>
          <div className="flex flex-wrap gap-2">
            {profile.intents.map((i) => (
              <span
                key={i}
                className="rounded-full border border-line px-3 py-1 text-sm"
              >
                {intentLabel[i]}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 text-sm text-muted">关于我</div>
          <p className="text-[15px] leading-relaxed">{profile.bio || "（还没写介绍）"}</p>
          {(myProfile.occupation || myProfile.education || myProfile.zodiac) &&
            isMe && (
              <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted">
                {myProfile.occupation && <span>💼 {myProfile.occupation}</span>}
                {myProfile.education && <span>🎓 {myProfile.education}</span>}
                {myProfile.zodiac && <span>✨ {myProfile.zodiac}</span>}
              </div>
            )}
        </div>

        <div>
          <div className="mb-1 text-sm text-muted">兴趣</div>
          <div className="flex flex-wrap gap-2">
            {profile.interests.map((t) => (
              <span
                key={t}
                className="rounded-full bg-surface-2 px-3 py-1 text-sm"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {view === "queued" && (
          <div className="animate-fadeUp rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm">
            <div className="font-semibold text-accent">✓ 开场白已送出</div>
            {isAiPersona(profile.id) ? (
              <>
                <p className="mt-1 text-muted">
                  {profile.name} 是测试搭子，正在查看你的打招呼…
                  {waitLeft != null && waitLeft > 0
                    ? ` 大约 ${waitLeft} 秒后会通过。`
                    : " 马上就好。"}
                </p>
                <p className="mt-2 text-xs text-muted">
                  通过后可进入聊天，对方会自动回复你一句。
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-muted">
                  你的开场白进入了 {profile.name} 的「待接受」。对方接受后，这句话就是你们对话的第一句。
                </p>
                <p className="mt-2 flex items-center gap-1 text-xs text-muted">
                  🌍 跨国有时差，Ta 可能在休息——开场白长期有效，不会过期，耐心等回应就好。
                </p>
                <button
                  onClick={() => setHello("accepted")}
                  className="mt-3 rounded-lg border border-line px-3 py-1.5 text-xs text-muted"
                >
                  （演示）模拟对方接受了
                </button>
              </>
            )}
          </div>
        )}

        {view === "accepted" && (
          <div className="animate-fadeUp rounded-2xl border border-success/40 bg-success/10 p-4 text-sm">
            <div className="font-semibold text-success">
              🎉 {profile.name} 已接受你的打招呼！
            </div>
            <p className="mt-1 text-muted">
              {isAiPersona(profile.id)
                ? "可以开始聊天了——对方会很快回复你。"
                : "可以开始聊天了。首次进入会话前需要完成真人认证。"}
            </p>
          </div>
        )}
      </div>

      {/* Opening-message composer with one-tap AI icebreakers */}
      {!isMe && view === "composing" && (
        <div className="animate-sheetUp sticky bottom-0 border-t border-line bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">
              给 {profile.name} 写一句开场白
              <span className="ml-1 text-xs text-muted">（对方接受后开始聊天）</span>
            </span>
            <button
              onClick={fetchAiIcebreakers}
              disabled={aiBusy}
              className="whitespace-nowrap rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent disabled:opacity-50"
            >
              {aiBusy ? "生成中…" : "✨ AI 一键破冰"}
            </button>
          </div>

          {aiSuggestions && aiSuggestions.length > 0 && (
            <div className="mb-2 space-y-2">
              <div className="text-[11px] text-muted">点一条直接填入，消除语言焦虑：</div>
              {aiSuggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setOpener(s);
                    setAiSuggestions(null);
                  }}
                  className="block w-full rounded-xl border border-line bg-surface-2 p-2.5 text-left text-[13px] leading-snug active:bg-surface"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <textarea
            value={opener}
            onChange={(e) => setOpener(e.target.value)}
            rows={2}
            autoFocus
            placeholder={`比如：嗨${profile.name}！我也喜欢${
              profile.interests[0] ?? "旅行"
            } 😊`}
            className="w-full resize-none rounded-xl border border-line bg-surface-2 px-4 py-3 outline-none focus:border-accent"
          />

          {rateLimited && (
            <div className="mt-1 text-[11px] text-muted">
              {left > 0
                ? `今日还可主动打招呼 ${left} 次（认证后无限）`
                : "今日主动打招呼次数已用完 · 认证或明天再来"}
            </div>
          )}

          <button
            onClick={sendOpener}
            disabled={!opener.trim() || (rateLimited && left <= 0)}
            className="btn-grad mt-2 w-full rounded-2xl py-3.5 font-semibold disabled:opacity-40"
          >
            发送开场白
          </button>
        </div>
      )}

      {/* Sticky action */}
      {view !== "composing" && (
        <div className="sticky bottom-0 border-t border-line bg-surface/95 p-4 backdrop-blur">
          {isMe ? (
            <div className="space-y-2">
              <p className="text-center text-xs text-muted">
                这是别人看到的你的主页预览
              </p>
              <button
                onClick={() => router.push("/me/edit")}
                className="btn-grad w-full rounded-2xl py-4 text-lg font-semibold"
              >
                编辑资料
              </button>
            </div>
          ) : (
            <>
              {view === "idle" && (
                <button
                  onClick={onSayHello}
                  className="w-full rounded-2xl bg-[#1c1c1f] py-4 text-lg font-semibold text-white shadow-[0_10px_28px_rgba(0,0,0,0.28)] active:bg-[#2a2a2e]"
                >
                  打招呼
                </button>
              )}
              {view === "queued" && (
                <button
                  disabled
                  className="w-full rounded-2xl border border-line py-4 font-semibold text-muted"
                >
                  {isAiPersona(profile.id) && waitLeft != null && waitLeft > 0
                    ? `⏳ ${profile.name} 查看中… ${waitLeft}s`
                    : `⏳ 等待 ${profile.name} 接受…`}
                </button>
              )}
              {view === "accepted" && (
                <button
                  onClick={onEnterChat}
                  className="w-full rounded-2xl bg-[#1c1c1f] py-4 text-lg font-semibold text-white shadow-[0_10px_28px_rgba(0,0,0,0.28)] active:bg-[#2a2a2e]"
                >
                  {tier === "verified" || isAiPersona(profile.id)
                    ? "进入聊天 →"
                    : "完成认证并开始聊天"}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}
