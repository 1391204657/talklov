"use client";

import { useEffect, useState } from "react";
import MeAvatarButton from "@/components/MeAvatarButton";
import DatingSimModal from "@/components/DatingSimModal";
import DuoDubModal from "@/components/DuoDubModal";
import DailyTopicPanel from "@/components/DailyTopicPanel";
import { useApp } from "@/lib/store";
import { DATING_SCENE, DATING_SCENE_ID } from "@/lib/datingSim";
import { todaysChallenge } from "@/lib/duoDub";

type TabId = "date" | "dub" | "topic";

const COMING_DATE_ZH = [
  { title: "跨国文化冲突", subtitle: "怎么用英文解释「彩礼 / 相亲」？" },
  { title: "恋爱破冰 · 中文赞美", subtitle: "怎么用优雅的中文给对方送上赞美？" },
  { title: "线上转线下", subtitle: "怎么自然地约出来见面？" },
  { title: "拒绝不伤人", subtitle: "如何礼貌说「我们不太合适」？" },
];

const COMING_DATE_EN = [
  {
    title: "Culture clash",
    subtitle: "How do you explain bride price / arranged intros in English?",
  },
  {
    title: "Icebreaker compliments",
    subtitle: "How do you give a graceful compliment in Chinese?",
  },
  {
    title: "Online → offline",
    subtitle: "How do you naturally suggest meeting up?",
  },
  {
    title: "Kind no’s",
    subtitle: "How do you politely say “we’re not a match”?",
  },
];

export default function Learn() {
  const { locale } = useApp();
  const en = locale === "en";
  const [tab, setTab] = useState<TabId>("date");
  const [simOpen, setSimOpen] = useState(false);
  const [dubOpen, setDubOpen] = useState(false);
  const challenge = todaysChallenge();
  const coming = en ? COMING_DATE_EN : COMING_DATE_ZH;

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const practice = q.get("practice");
    const learnTab = q.get("tab");
    if (learnTab === "topic" || practice === "daily-topic") {
      setTab("topic");
      window.history.replaceState({}, "", "/learn");
      return;
    }
    if (learnTab === "dub" || practice === "duo-dub") {
      setTab("dub");
      if (practice === "duo-dub") setDubOpen(true);
      window.history.replaceState({}, "", "/learn");
      return;
    }
    if (practice === DATING_SCENE_ID || practice === "1") {
      setTab("date");
      setSimOpen(true);
      window.history.replaceState({}, "", "/learn");
    }
  }, []);

  const tabs = (
    [
      { id: "date" as const, label: en ? "Break ice" : "捅破窗纸" },
      { id: "dub" as const, label: en ? "Back & forth" : "你来我往" },
      { id: "topic" as const, label: en ? "Spill tea" : "跨国吃瓜" },
    ] as const
  );

  return (
    <main>
      <header className="sticky top-0 z-20 bg-background/90 px-4 py-2 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold">{en ? "Lianyu" : "练遇"}</h1>
          <MeAvatarButton />
        </div>
        <div className="mt-2 flex gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-full py-2 text-[13px] font-medium transition ${
                tab === t.id
                  ? "bg-accent/15 text-accent"
                  : "bg-surface-2 text-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-4 px-4 pb-4 pt-3">
        {tab === "date" ? (
          <>
            <div className="rounded-2xl bg-[linear-gradient(135deg,#ff5a7e22,#4a9eff22)] p-5">
              <svg
                viewBox="0 0 24 24"
                className="h-8 w-8 text-accent"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="7" width="18" height="11" rx="3" />
                <circle cx="9" cy="12.5" r="1.5" />
                <circle cx="15" cy="12.5" r="1.5" />
                <path d="M9 7V5a3 3 0 0 1 6 0v2" />
              </svg>
              <h2 className="mt-2 text-lg font-bold">
                {en ? "AI dating / social simulator" : "AI 约会 / 交友模拟器"}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {en
                  ? "Practice real cross-border conversation lines. Finish a scene, then share to Moments or send as an icebreaker."
                  : "练真正跨国交友会用到的话术。通关后可一键晒到动态，或发给搭子当破冰。"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSimOpen(true)}
              className="w-full rounded-2xl border border-accent/30 bg-surface p-4 text-left shadow-sm transition active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">
                    {DATING_SCENE.badge} · {en ? "Ready" : "可练"}
                  </span>
                  <div className="mt-2 text-[15px] font-semibold">
                    {DATING_SCENE.title}
                  </div>
                  <p className="mt-1 text-sm text-muted">{DATING_SCENE.subtitle}</p>
                </div>
                <span className="mt-1 text-muted">→</span>
              </div>
              <div className="mt-3 text-xs text-muted">
                {en
                  ? "3 English rounds · score badge · share / DM"
                  : "3 轮英文对话 · 打分勋章 · 晒动态 / 发私信"}
              </div>
            </button>

            {coming.map((s) => (
              <div
                key={s.title}
                className="rounded-2xl border border-line bg-surface/70 p-4 opacity-70"
              >
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
                  {en ? "Coming soon" : "即将上线"}
                </span>
                <div className="mt-2 text-[15px] font-semibold">{s.title}</div>
                <p className="mt-1 text-sm text-muted">{s.subtitle}</p>
              </div>
            ))}
          </>
        ) : tab === "dub" ? (
          <>
            <div className="rounded-2xl bg-[linear-gradient(135deg,#4a9eff22,#22c55e22)] p-5">
              <svg
                viewBox="0 0 24 24"
                className="h-8 w-8 text-accent-2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0" />
                <path d="M12 17v4" />
                <path d="M8 21h8" />
              </svg>
              <h2 className="mt-2 text-lg font-bold">
                {en ? "Today's back & forth" : "今日你来我往"}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {en
                  ? "Listen → pick keywords → dub your role → post a card to find a match. Practice listening and speaking, then start chatting."
                  : "听原声 → 选关键词 → 配你的角色 → 发卡片找另一半合配。练听力与口语，还能自然开聊。"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setDubOpen(true)}
              className="w-full rounded-2xl border border-accent/30 bg-surface p-4 text-left shadow-sm transition active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
                    {en ? "Live today" : "今日上架"}
                  </span>
                  <div className="mt-2 text-[15px] font-semibold">
                    {challenge.title}
                  </div>
                  <p className="mt-1 text-sm text-muted">{challenge.styleHint}</p>
                </div>
                <span className="mt-1 text-muted">→</span>
              </div>
              <div className="mt-3 text-xs text-muted">
                {en
                  ? "Listening fill-in · 10s dub · find a partner"
                  : "听力填空 · 10 秒配音 · 寻找合配搭子"}
              </div>
            </button>

            <div className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
              <div className="font-medium text-foreground">
                {en ? "How to play" : "怎么玩"}
              </div>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-relaxed">
                {en ? (
                  <>
                    <li>Listen to the sample bilingual lines</li>
                    <li>Pick the key words you heard (required before dubbing)</li>
                    <li>Record your side of the role</li>
                    <li>Share to Moments or DM a match to complete the other side</li>
                  </>
                ) : (
                  <>
                    <li>听一遍示范双语台词</li>
                    <li>选出听到的核心词（答对才能配音）</li>
                    <li>录下你这一边的角色</li>
                    <li>晒到动态或发给搭子，邀请对方合配另一边</li>
                  </>
                )}
              </ol>
            </div>
          </>
        ) : (
          <DailyTopicPanel />
        )}
      </div>

      <DatingSimModal open={simOpen} onClose={() => setSimOpen(false)} />
      <DuoDubModal open={dubOpen} onClose={() => setDubOpen(false)} />
    </main>
  );
}
