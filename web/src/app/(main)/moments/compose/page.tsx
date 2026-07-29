"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import MeAvatarButton from "@/components/MeAvatarButton";
import {
  consumeMomentDraft,
  consumeMomentTag,
  saveUserMoment,
} from "@/lib/datingSim";

export default function ComposeMomentPage() {
  const { locale, tier, openRegister, myProfile } = useApp();
  const router = useRouter();
  const [text, setText] = useState("");
  const [tag, setTag] = useState("动态");
  const [posted, setPosted] = useState(false);

  useEffect(() => {
    const draft = consumeMomentDraft();
    const draftTag = consumeMomentTag();
    if (draft) setText(draft);
    if (draftTag) {
      setTag(draftTag);
    } else if (draft.includes("#今日议题") || draft.includes("#Today's topic")) {
      setTag("今日议题");
    } else if (draft.includes("合配") || draft.includes("duo")) {
      setTag("合配挑战");
    } else if (draft.includes("约会破冰") || draft.includes("AI")) {
      setTag("AI 约会破冰");
    }
  }, []);

  if (tier === "guest") {
    return (
      <main className="p-4 pt-3">
        <header className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-muted"
          >
            {locale === "en" ? "Back" : "返回"}
          </button>
          <MeAvatarButton />
        </header>
        <div className="rounded-2xl border border-line bg-surface p-6 text-center">
          <p className="text-sm text-muted">
            {locale === "en"
              ? "Sign in to share a moment."
              : "登录后即可发布动态。"}
          </p>
          <button
            type="button"
            onClick={() =>
              openRegister(locale === "en" ? "post a moment" : "发布动态")
            }
            className="btn-grad mt-4 rounded-full px-6 py-2.5 text-sm font-semibold"
          >
            {locale === "en" ? "Sign up / Log in" : "注册 / 登录"}
          </button>
        </div>
      </main>
    );
  }

  const publish = () => {
    if (!text.trim()) return;
    saveUserMoment({
      id: `um-${Date.now()}`,
      text: text.trim(),
      time: "刚刚",
      likes: 0,
      comments: [],
      corrections: [],
      tag,
    });
    setPosted(true);
    setTimeout(() => router.push("/moments"), 500);
  };

  return (
    <main className="p-4 pt-3">
      <header className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-muted"
        >
          {locale === "en" ? "Cancel" : "取消"}
        </button>
        <div className="text-sm font-semibold">
          {locale === "en" ? "New moment" : "发动态"}
        </div>
        <MeAvatarButton />
      </header>

      {myProfile.name ? (
        <p className="mb-2 text-xs text-muted">以 {myProfile.name} 发布</p>
      ) : null}
      {tag ? (
        <p className="mb-2 text-xs text-accent">#{tag}</p>
      ) : null}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        maxLength={1000}
        placeholder={
          locale === "en"
            ? "Share a language moment, ask for a correction…"
            : "分享学语言的瞬间，也可以求纠错…"
        }
        className="w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-[15px] leading-relaxed outline-none focus:border-accent"
      />
      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>{text.length}/1000</span>
        {posted ? (
          <span className="text-success">
            {locale === "en" ? "Posted!" : "已发布"}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        disabled={!text.trim() || posted}
        onClick={publish}
        className="btn-grad mt-4 w-full rounded-xl py-3.5 text-sm font-semibold disabled:opacity-40"
      >
        {locale === "en" ? "Post" : "发布"}
      </button>
    </main>
  );
}
