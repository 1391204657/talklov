"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import MeAvatarButton from "@/components/MeAvatarButton";
import { compressImageFile } from "@/lib/photoUpload";
import {
  consumeMomentDraft,
  consumeMomentTag,
  MAX_MOMENT_IMAGES,
  saveUserMoment,
} from "@/lib/datingSim";

type DraftImage = { id: string; url: string };

export default function ComposeMomentPage() {
  const { locale, tier, userId, myProfile, openRegister } = useApp();
  const router = useRouter();
  const [text, setText] = useState("");
  const [tag, setTag] = useState("动态");
  const [posted, setPosted] = useState(false);
  const [images, setImages] = useState<DraftImage[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loggedIn =
    tier !== "guest" || !!userId || !!myProfile.phoneE164;
  const en = locale === "en";

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

  if (!loggedIn) {
    return (
      <main className="p-4 pt-3">
        <header className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-muted"
          >
            {en ? "Back" : "返回"}
          </button>
          <MeAvatarButton />
        </header>
        <div className="rounded-2xl border border-line bg-surface p-6 text-center">
          <p className="text-sm text-muted">
            {en ? "Sign in to share a moment." : "登录后即可发布动态。"}
          </p>
          <button
            type="button"
            onClick={() =>
              openRegister(en ? "post a moment" : "发布动态")
            }
            className="btn-grad mt-4 rounded-full px-6 py-2.5 text-sm font-semibold"
          >
            {en ? "Sign up / Log in" : "注册 / 登录"}
          </button>
        </div>
      </main>
    );
  }

  const onPickPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_MOMENT_IMAGES - images.length;
    if (room <= 0) return;
    const picked = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, room);
    if (!picked.length) {
      alert(en ? "Please choose image files." : "请选择图片文件。");
      return;
    }
    setBusy(true);
    try {
      const next: DraftImage[] = [];
      for (const file of picked) {
        try {
          const url = await compressImageFile(file);
          next.push({ id: `${Date.now()}-${Math.random()}`, url });
        } catch {
          /* skip bad file */
        }
      }
      if (next.length) setImages((prev) => [...prev, ...next].slice(0, MAX_MOMENT_IMAGES));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((x) => x.id !== id));
  };

  const canPublish = (text.trim().length > 0 || images.length > 0) && !posted && !busy;

  const publish = () => {
    if (!canPublish) return;
    saveUserMoment({
      id: `um-${Date.now()}`,
      text: text.trim(),
      time: "刚刚",
      likes: 0,
      comments: [],
      corrections: [],
      tag,
      media: images.map((img) => ({
        type: "image" as const,
        url: img.url,
      })),
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
          {en ? "Cancel" : "取消"}
        </button>
        <div className="text-sm font-semibold">
          {en ? "New moment" : "发动态"}
        </div>
        <MeAvatarButton />
      </header>

      {myProfile.name ? (
        <p className="mb-2 text-xs text-muted">
          {en ? `Posting as ${myProfile.name}` : `以 ${myProfile.name} 发布`}
        </p>
      ) : null}
      {tag ? (
        <p className="mb-2 text-xs text-accent">#{tag}</p>
      ) : null}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        maxLength={1000}
        placeholder={
          en
            ? "Share a language moment, ask for a correction…"
            : "分享学语言的瞬间，也可以求纠错…"
        }
        className="w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-[15px] leading-relaxed outline-none focus:border-accent"
      />

      {/* Photo grid */}
      <div className="mt-3 grid grid-cols-3 gap-2">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative aspect-square overflow-hidden rounded-xl bg-surface-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt=""
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-xs text-white"
                aria-label={en ? "Remove" : "删除"}
              >
                ✕
              </button>
            </div>
          ))}
          {images.length < MAX_MOMENT_IMAGES && (
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line bg-surface text-muted disabled:opacity-50"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="8.5" cy="10" r="1.5" />
                <path d="m21 15-4.5-4.5L9 18" />
              </svg>
              <span className="text-[11px]">
                {en ? "Photo" : "照片"}
              </span>
            </button>
          )}
        </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onPickPhotos(e.target.files)}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || images.length >= MAX_MOMENT_IMAGES}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium disabled:opacity-40"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="8.5" cy="10" r="1.5" />
            <path d="m21 15-4.5-4.5L9 18" />
          </svg>
          {en ? "Add photos" : "添加照片"}
          <span className="text-muted">
            {images.length}/{MAX_MOMENT_IMAGES}
          </span>
        </button>
        <button
          type="button"
          disabled
          title={en ? "Coming soon" : "即将支持"}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted opacity-55"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <rect x="3" y="6" width="13" height="12" rx="2" />
            <path d="m16 10 5-3v10l-5-3" />
          </svg>
          {en ? "Video (soon)" : "视频（即将）"}
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>{text.length}/1000</span>
        {posted ? (
          <span className="text-success">{en ? "Posted!" : "已发布"}</span>
        ) : busy ? (
          <span>{en ? "Processing…" : "处理中…"}</span>
        ) : null}
      </div>
      <button
        type="button"
        disabled={!canPublish}
        onClick={publish}
        className="btn-grad mt-4 w-full rounded-xl py-3.5 text-sm font-semibold disabled:opacity-40"
      >
        {en ? "Post" : "发布"}
      </button>
    </main>
  );
}
