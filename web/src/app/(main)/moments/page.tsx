"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { profiles } from "@/lib/mockData";
import MeAvatarButton from "@/components/MeAvatarButton";
import DuoDubModal from "@/components/DuoDubModal";
import {
  MomentComment,
  MomentCorrection,
  MomentMedia,
  momentPosts,
} from "@/lib/momentsData";
import { loadUserMoments, type UserMomentPost } from "@/lib/datingSim";
import { getDuoInvite, type DuoInvite } from "@/lib/duoDub";
import { useApp } from "@/lib/store";

const IconHeart = ({ filled }: { filled?: boolean }) => (
  <svg viewBox="0 0 20 20" className="inline h-4 w-4" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 17s-7-4.5-7-9a3.5 3.5 0 0 1 7 .5A3.5 3.5 0 0 1 17 8c0 4.5-7 9-7 9Z" />
  </svg>
);
const IconChat = () => (
  <svg viewBox="0 0 20 20" className="inline h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8l-4 3v-3a2 2 0 0 1-1-1.7V5Z" />
  </svg>
);
const IconPen = () => (
  <svg viewBox="0 0 20 20" className="inline h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.5 3.5l4 4L6 18H2v-4L12.5 3.5Z" />
  </svg>
);

type LocalState = {
  liked: boolean;
  likes: number;
  comments: MomentComment[];
  corrections: MomentCorrection[];
  commentDraft: string;
  correctDraft: string;
  showComment: boolean;
  showCorrect: boolean;
};

function displayName(by: string, fallbackMe: string) {
  if (by === fallbackMe || by === "我" || by === "游客") return by;
  const p = profiles.find((x) => x.id === by || x.name === by);
  return p?.name ?? by;
}

function MediaGrid({ media }: { media: MomentMedia[] }) {
  if (!media.length) return null;
  const images = media.filter((m) => m.type === "image");
  const videos = media.filter((m) => m.type === "video");

  return (
    <div className="mt-3 space-y-2">
      {images.length === 1 ? (
        <div className="overflow-hidden rounded-xl bg-surface-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[0].url}
            alt={images[0].alt || ""}
            className="max-h-72 w-full object-cover"
          />
        </div>
      ) : images.length > 1 ? (
        <div
          className={`grid gap-1.5 ${
            images.length === 2 ? "grid-cols-2" : "grid-cols-3"
          }`}
        >
          {images.map((m, i) => (
            <div
              key={`${m.url}-${i}`}
              className="aspect-square overflow-hidden rounded-lg bg-surface-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.url}
                alt={m.alt || ""}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      ) : null}

      {videos.map((_, i) => (
        <div
          key={`vid-${i}`}
          className="relative overflow-hidden rounded-xl bg-surface-2"
        >
          <div className="flex aspect-video items-center justify-center text-sm text-muted">
            🎬 视频即将支持
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Moments() {
  const { myProfile, tier, openRegister } = useApp();
  const myName =
    tier === "guest" ? "游客" : myProfile.name.trim() || "我";
  const myPhoto = myProfile.photos[0] || "";
  const [userPosts, setUserPosts] = useState<UserMomentPost[]>([]);
  const [joinInvite, setJoinInvite] = useState<DuoInvite | null>(null);

  useEffect(() => {
    setUserPosts(loadUserMoments());
  }, []);

  const initial = useMemo(() => {
    const map: Record<string, LocalState> = {};
    for (const p of momentPosts) {
      map[p.id] = {
        liked: false,
        likes: p.likes,
        comments: [...p.seedComments],
        corrections: [...p.corrections],
        commentDraft: "",
        correctDraft: "",
        showComment: false,
        showCorrect: false,
      };
    }
    for (const p of userPosts) {
      map[p.id] = {
        liked: false,
        likes: p.likes,
        comments: [...p.comments],
        corrections: [...p.corrections],
        commentDraft: "",
        correctDraft: "",
        showComment: false,
        showCorrect: false,
      };
    }
    return map;
  }, [userPosts]);

  const [state, setState] = useState<Record<string, LocalState>>({});

  useEffect(() => {
    setState(initial);
  }, [initial]);

  const onJoinDuo = (inviteId?: string) => {
    if (!inviteId) return;
    if (tier === "guest") {
      openRegister("合配挑战");
      return;
    }
    const inv = getDuoInvite(inviteId);
    if (!inv) {
      alert("合配邀请已过期或不在本机，请让对方重新晒一次。");
      return;
    }
    setJoinInvite(inv);
  };

  const patch = (id: string, partial: Partial<LocalState>) => {
    setState((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return { ...prev, [id]: { ...cur, ...partial } };
    });
  };

  const toggleLike = (id: string) => {
    setState((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      const liked = !cur.liked;
      return {
        ...prev,
        [id]: { ...cur, liked, likes: cur.likes + (liked ? 1 : -1) },
      };
    });
  };

  const openComment = (id: string) => {
    if (tier === "guest") {
      openRegister("评论动态");
      return;
    }
    setState((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return {
        ...prev,
        [id]: {
          ...cur,
          showComment: !cur.showComment,
          showCorrect: false,
        },
      };
    });
  };

  const openCorrect = (id: string) => {
    if (tier === "guest") {
      openRegister("帮人纠错");
      return;
    }
    setState((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return {
        ...prev,
        [id]: {
          ...cur,
          showCorrect: !cur.showCorrect,
          showComment: false,
        },
      };
    });
  };

  const submitComment = (id: string, e: FormEvent) => {
    e.preventDefault();
    setState((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      const text = cur.commentDraft.trim();
      if (!text) return prev;
      return {
        ...prev,
        [id]: {
          ...cur,
          commentDraft: "",
          showComment: false,
          comments: [...cur.comments, { by: myName, text }],
        },
      };
    });
  };

  const submitCorrection = (id: string, e: FormEvent) => {
    e.preventDefault();
    setState((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      const text = cur.correctDraft.trim();
      if (!text) return prev;
      return {
        ...prev,
        [id]: {
          ...cur,
          correctDraft: "",
          showCorrect: false,
          corrections: [...cur.corrections, { by: myName, text }],
        },
      };
    });
  };

  return (
    <main>
      <header className="sticky top-0 z-20 flex items-center justify-between bg-background/90 px-4 py-2 backdrop-blur">
        <h1 className="text-base font-semibold">动态</h1>
        <MeAvatarButton />
      </header>
      <ul className="space-y-3 px-4 pb-4 pt-1">
        {userPosts.map((post) => {
          const local = state[post.id];
          if (!local) return null;
          return (
            <li
              key={post.id}
              className="rounded-2xl border border-accent/25 bg-surface p-4"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-9 w-9 rounded-full bg-cover bg-center bg-surface-2"
                  style={
                    myPhoto
                      ? { backgroundImage: `url(${myPhoto})` }
                      : undefined
                  }
                />
                <div>
                  <div className="text-sm font-medium">{myName}</div>
                  <div className="text-[11px] text-muted">
                    {post.tag ? `${post.tag} · ` : ""}
                    {post.time}
                  </div>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed">
                {post.text}
              </p>
              {post.media && post.media.length > 0 ? (
                <MediaGrid media={post.media} />
              ) : null}
              {post.duoInviteId ? (
                <div className="mt-3 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2 text-xs text-muted">
                  合配邀请卡 · 点「和我合配」录另一边角色
                </div>
              ) : null}
              {local.comments.length > 0 && (
                <div className="mt-3 space-y-1.5 rounded-xl bg-surface-2/80 px-3 py-2">
                  {local.comments.map((c, i) => (
                    <p
                      key={`${post.id}-cm-${i}`}
                      className="text-sm leading-snug"
                    >
                      <span className="font-medium text-accent">
                        {displayName(c.by, myName)}
                      </span>
                      <span className="text-muted">：{c.text}</span>
                    </p>
                  ))}
                </div>
              )}
              {local.corrections.length > 0 && (
                <div className="mt-3 space-y-2">
                  {local.corrections.map((c, i) => (
                    <div
                      key={`${post.id}-c-${i}`}
                      className="rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm"
                    >
                      <span className="inline-flex items-center gap-1 text-success">
                        <IconPen /> 纠错 · {displayName(c.by, myName)}：
                      </span>
                      <span className="text-muted">{c.text}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted">
                <button
                  type="button"
                  onClick={() => toggleLike(post.id)}
                  className={local.liked ? "text-accent" : undefined}
                >
                  <IconHeart filled={local.liked} /> {local.likes}
                </button>
                <button type="button" onClick={() => openComment(post.id)}>
                  <IconChat /> {local.comments.length}
                </button>
                <button type="button" onClick={() => openCorrect(post.id)}>
                  <IconPen /> 帮 TA 纠错
                </button>
                {post.duoInviteId ? (
                  <button
                    type="button"
                    className="font-medium text-accent"
                    onClick={() => onJoinDuo(post.duoInviteId)}
                  >
                    和我合配
                  </button>
                ) : null}
              </div>
              {local.showComment && (
                <form
                  onSubmit={(e) => submitComment(post.id, e)}
                  className="mt-3 space-y-2"
                >
                  <textarea
                    value={local.commentDraft}
                    onChange={(e) =>
                      patch(post.id, { commentDraft: e.target.value })
                    }
                    rows={2}
                    placeholder="写一条评论…"
                    className="w-full resize-none rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-full px-3 py-1.5 text-xs text-muted"
                      onClick={() =>
                        patch(post.id, {
                          showComment: false,
                          commentDraft: "",
                        })
                      }
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                      disabled={!local.commentDraft.trim()}
                    >
                      发送评论
                    </button>
                  </div>
                </form>
              )}
              {local.showCorrect && (
                <form
                  onSubmit={(e) => submitCorrection(post.id, e)}
                  className="mt-3 space-y-2"
                >
                  <textarea
                    value={local.correctDraft}
                    onChange={(e) =>
                      patch(post.id, { correctDraft: e.target.value })
                    }
                    rows={2}
                    placeholder="写下更自然的说法或语法提示…"
                    className="w-full resize-none rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-full px-3 py-1.5 text-xs text-muted"
                      onClick={() =>
                        patch(post.id, {
                          showCorrect: false,
                          correctDraft: "",
                        })
                      }
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                      disabled={!local.correctDraft.trim()}
                    >
                      发布纠错
                    </button>
                  </div>
                </form>
              )}
            </li>
          );
        })}

        {momentPosts.map((post) => {
          const a = profiles.find((p) => p.id === post.authorId);
          if (!a) return null;
          const local = state[post.id];
          if (!local) return null;
          // Baseline post.comments + newly added beyond seeds
          const commentCount =
            post.comments +
            Math.max(0, local.comments.length - post.seedComments.length);

          return (
            <li
              key={post.id}
              className="rounded-2xl border border-line bg-surface p-4"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-9 w-9 rounded-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${a.photo})` }}
                />
                <div>
                  <div className="text-sm font-medium">{a.name}</div>
                  <div className="text-[11px] text-muted">
                    {a.country === "CN" ? "🇨🇳" : "🇺🇸"} {post.time}
                  </div>
                </div>
              </div>

              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed">
                {post.text}
              </p>

              <MediaGrid media={post.media} />

              {local.comments.length > 0 && (
                <div className="mt-3 space-y-1.5 rounded-xl bg-surface-2/80 px-3 py-2">
                  {local.comments.map((c, i) => (
                    <p key={`${post.id}-cm-${i}`} className="text-sm leading-snug">
                      <span className="font-medium text-accent">
                        {displayName(c.by, myName)}
                      </span>
                      <span className="text-muted">：{c.text}</span>
                    </p>
                  ))}
                </div>
              )}

              {local.corrections.length > 0 && (
                <div className="mt-3 space-y-2">
                  {local.corrections.map((c, i) => (
                    <div
                      key={`${post.id}-c-${i}`}
                      className="rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm"
                    >
                      <span className="inline-flex items-center gap-1 text-success">
                        <IconPen /> 纠错 · {displayName(c.by, myName)}：
                      </span>
                      <span className="text-muted">{c.text}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted">
                <button
                  type="button"
                  onClick={() => toggleLike(post.id)}
                  className={local.liked ? "text-accent" : undefined}
                >
                  <IconHeart filled={local.liked} /> {local.likes}
                </button>
                <button
                  type="button"
                  onClick={() => openComment(post.id)}
                  className={local.showComment ? "text-accent" : undefined}
                >
                  <IconChat /> {commentCount}
                </button>
                <button type="button" onClick={() => openCorrect(post.id)}>
                  <IconPen /> 帮 TA 纠错
                </button>
              </div>

              {local.showComment && (
                <form
                  onSubmit={(e) => submitComment(post.id, e)}
                  className="mt-3 space-y-2"
                >
                  <textarea
                    value={local.commentDraft}
                    onChange={(e) =>
                      patch(post.id, { commentDraft: e.target.value })
                    }
                    rows={2}
                    autoFocus
                    placeholder="写一条评论…"
                    className="w-full resize-none rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-full px-3 py-1.5 text-xs text-muted"
                      onClick={() =>
                        patch(post.id, {
                          showComment: false,
                          commentDraft: "",
                        })
                      }
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                      disabled={!local.commentDraft.trim()}
                    >
                      发送评论
                    </button>
                  </div>
                </form>
              )}

              {local.showCorrect && (
                <form
                  onSubmit={(e) => submitCorrection(post.id, e)}
                  className="mt-3 space-y-2"
                >
                  <textarea
                    value={local.correctDraft}
                    onChange={(e) =>
                      patch(post.id, { correctDraft: e.target.value })
                    }
                    rows={2}
                    autoFocus
                    placeholder="写下更自然的说法或语法提示…"
                    className="w-full resize-none rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-full px-3 py-1.5 text-xs text-muted"
                      onClick={() =>
                        patch(post.id, {
                          showCorrect: false,
                          correctDraft: "",
                        })
                      }
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                      disabled={!local.correctDraft.trim()}
                    >
                      发布纠错
                    </button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      <DuoDubModal
        open={Boolean(joinInvite)}
        joinInvite={joinInvite}
        onClose={() => setJoinInvite(null)}
      />
    </main>
  );
}
