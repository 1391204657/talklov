"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import {
  TOPIC_MOMENT_TAG,
  buildTopicMomentDraft,
  hotTakesBySide,
  todaysTopic,
  type HotTake,
  type TopicStanceId,
} from "@/lib/dailyTopic";
import { writeMomentDraft } from "@/lib/datingSim";
import { speakLine } from "@/lib/duoDub";

export default function DailyTopicPanel() {
  const { locale, tier, openRegister } = useApp();
  const router = useRouter();
  const topic = useMemo(() => todaysTopic(), []);
  const en = locale === "en";
  const [stance, setStance] = useState<TopicStanceId | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [stamped, setStamped] = useState<Record<string, boolean>>({});
  const [hint, setHint] = useState<string | null>(null);

  const usTakes = hotTakesBySide(topic, "US");
  const cnTakes = hotTakesBySide(topic, "CN");

  const playTake = (take: HotTake) => {
    setPlayingId(take.id);
    speakLine(take.text, take.lang);
    window.setTimeout(() => setPlayingId(null), 2800);
  };

  const playSide = (side: "US" | "CN") => {
    const list = side === "US" ? usTakes : cnTakes;
    if (!list.length) return;
    const pick =
      stance != null
        ? list.find((t) => t.stance === stance) || list[0]
        : list[0];
    playTake(pick);
  };

  const postTake = () => {
    if (!stance) {
      setHint(en ? "Pick a side first" : "先选一个立场再发表");
      return;
    }
    if (tier === "guest") {
      openRegister(en ? "share today's topic" : "参与今日议题");
      return;
    }
    const draft = buildTopicMomentDraft(topic, stance, en ? "en" : "zh");
    writeMomentDraft(draft, TOPIC_MOMENT_TAG);
    router.push("/moments/compose");
  };

  const stamp = (id: string) => {
    setStamped((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[linear-gradient(135deg,#f0a0bd33,#9bb8f533)] p-5">
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-accent" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
        </svg>
        <h2 className="mt-2 text-lg font-bold">
          {en ? "Cross-border tea" : "跨国吃瓜"}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {en
            ? "Pick a side, hear native hot takes, then post to Moments with today's hashtag."
            : "先选边，再听母语者热门看法，一键发到动态并带上今日话题标签。"}
        </p>
      </div>

      <div className="rounded-2xl border border-accent/30 bg-surface p-4 shadow-sm">
        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">
          {en ? topic.hintEn : topic.hintZh}
        </span>
        <h3 className="mt-3 text-[15px] font-semibold leading-snug">
          {en ? topic.topicEn : topic.topicZh}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          {en ? topic.topicZh : topic.topicEn}
        </p>
        <div className="mt-1 text-xs text-accent">#{en ? `Today's topic: ${topic.hashtag}` : `今日议题：${topic.hashtag}`}</div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {(
            [
              { id: "a" as const, label: en ? topic.stanceA.en : topic.stanceA.zh },
              { id: "b" as const, label: en ? topic.stanceB.en : topic.stanceB.zh },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setStance(s.id);
                setHint(null);
              }}
              className={`rounded-xl border px-3 py-3 text-left text-sm font-medium transition active:scale-[0.98] ${
                stance === s.id
                  ? "border-accent bg-accent/15 text-foreground"
                  : "border-line bg-surface-2 text-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {hint ? <p className="mt-2 text-xs text-danger">{hint}</p> : null}
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="text-sm font-semibold">
          {en ? "Hear hot takes" : "听听热门看法"}
        </div>
        <p className="mt-1 text-xs text-muted">
          {en
            ? "MVP uses voice demo (TTS). Real user clips come later."
            : "MVP 先用语音演示（系统朗读）。真实用户语音后续接入。"}
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => playSide("US")}
            disabled={!usTakes.length}
            className="rounded-xl border border-line bg-surface-2 px-3 py-3 text-left text-sm font-medium disabled:opacity-40"
          >
            {en ? "Hear a US guy's take" : "听听美区男生的说法"}
          </button>
          <button
            type="button"
            onClick={() => playSide("CN")}
            disabled={!cnTakes.length}
            className="rounded-xl border border-line bg-surface-2 px-3 py-3 text-left text-sm font-medium disabled:opacity-40"
          >
            {en ? "Hear a CN take" : "听听中区的说法"}
          </button>
        </div>

        <ul className="mt-4 space-y-2">
          {topic.hotTakes.map((take) => (
            <li
              key={take.id}
              className={`rounded-xl border px-3 py-2.5 ${
                playingId === take.id
                  ? "border-accent/40 bg-accent/10"
                  : "border-line bg-background/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => playTake(take)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                    <span className="font-medium text-foreground">{take.name}</span>
                    <span>· {take.side}</span>
                    <span>· {take.lang === "en" ? "EN" : "中文"}</span>
                    <span>· {take.likes} ♥</span>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">
                    {take.text}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => stamp(take.id)}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    stamped[take.id]
                      ? "bg-success/15 text-success"
                      : "bg-surface-2 text-muted"
                  }`}
                >
                  {stamped[take.id]
                    ? en
                      ? "Native ✓"
                      : "地道 ✓"
                    : en
                      ? "Stamp"
                      : "盖章"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={postTake}
        className="btn-grad w-full rounded-xl py-3.5 text-sm font-semibold"
      >
        {en ? "Post your take to Moments" : "用中文/英文发表你的看法"}
      </button>

      <div className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
        <div className="font-medium text-foreground">
          {en ? "How it works" : "怎么玩"}
        </div>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-relaxed">
          <li>{en ? "Read today's US–CN culture prompt" : "看今日美中文化议题"}</li>
          <li>{en ? "Pick a side" : "先选一个立场"}</li>
          <li>{en ? "Listen to hot takes, stamp “sounds native”" : "听热门看法，给地道说法盖章"}</li>
          <li>
            {en
              ? "Post to Moments — auto-tagged #Today's topic"
              : "一键发动态，自动带上 #今日议题"}
          </li>
        </ol>
      </div>
    </div>
  );
}
