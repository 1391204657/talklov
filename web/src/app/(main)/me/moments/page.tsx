"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { loadUserMoments, type UserMomentPost } from "@/lib/datingSim";
import {
  fetchMyMomentsFromDb,
  mergeMomentsOrdered,
  migrateLocalMomentsToCloud,
  removeUserMomentEverywhere,
} from "@/lib/momentsDb";

type Tab = "posts" | "activity";

type ActivityItem = {
  id: string;
  kind: "comment" | "correction";
  by: string;
  text: string;
  postId: string;
  postPreview: string;
  postTime: string;
};

function MediaThumb({ post }: { post: UserMomentPost }) {
  const img = post.media?.find((m) => m.type === "image");
  if (!img) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={img.url}
      alt=""
      className="mt-2 h-20 w-20 rounded-lg object-cover bg-surface-2"
    />
  );
}

export default function MyMomentsPage() {
  const { locale, tier, openRegister, userId } = useApp();
  const en = locale === "en";
  const [tab, setTab] = useState<Tab>("posts");
  const [posts, setPosts] = useState<UserMomentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      if (userId) {
        await migrateLocalMomentsToCloud(userId);
        const db = await fetchMyMomentsFromDb(userId);
        const local = loadUserMoments();
        setPosts(mergeMomentsOrdered(db, local));
      } else {
        setPosts(loadUserMoments());
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const activity = useMemo(() => {
    const items: ActivityItem[] = [];
    for (const p of posts) {
      const preview = p.text.replace(/\s+/g, " ").slice(0, 48);
      for (let i = 0; i < p.comments.length; i++) {
        const c = p.comments[i];
        items.push({
          id: `${p.id}-c-${i}`,
          kind: "comment",
          by: c.by,
          text: c.text,
          postId: p.id,
          postPreview: preview,
          postTime: p.time,
        });
      }
      for (let i = 0; i < p.corrections.length; i++) {
        const c = p.corrections[i];
        items.push({
          id: `${p.id}-x-${i}`,
          kind: "correction",
          by: c.by,
          text: c.text,
          postId: p.id,
          postPreview: preview,
          postTime: p.time,
        });
      }
    }
    return items;
  }, [posts]);

  const totalLikes = posts.reduce((n, p) => n + (p.likes || 0), 0);
  const totalComments = posts.reduce((n, p) => n + p.comments.length, 0);
  const totalCorrections = posts.reduce(
    (n, p) => n + p.corrections.length,
    0
  );

  const onDelete = async (id: string) => {
    if (
      !window.confirm(en ? "Delete this moment?" : "确定删除这条动态？")
    ) {
      return;
    }
    await removeUserMomentEverywhere(id);
    await reload();
    if (expanded === id) setExpanded(null);
  };

  if (tier === "guest" && !userId) {
    return (
      <main className="px-4 py-8">
        <h1 className="text-xl font-semibold">
          {en ? "My moments" : "我的动态"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {en
            ? "Sign in to publish moments and see replies."
            : "登录后可发布动态，并查看点赞、评论与纠错。"}
        </p>
        <button
          type="button"
          onClick={() => openRegister()}
          className="btn-grad mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          {en ? "Sign in" : "去登录"}
        </button>
      </main>
    );
  }

  return (
    <main className="px-4 pb-8 pt-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Link href="/me" className="text-xs text-muted hover:text-ink">
            {en ? "← Me" : "← 我的"}
          </Link>
          <h1 className="mt-1 text-xl font-semibold">
            {en ? "My moments" : "我的动态"}
          </h1>
        </div>
        <Link
          href="/moments/compose"
          className="rounded-xl border border-line px-3 py-1.5 text-xs font-medium"
        >
          {en ? "Post" : "发动态"}
        </Link>
      </div>

      <p className="mt-1 text-sm text-muted">
        {en
          ? "Your posts and interactions (synced when online)."
          : "你发布的动态与收到的互动（登录后云端同步）。"}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-line bg-surface px-3 py-2 text-center">
          <div className="text-lg font-semibold tabular-nums">{posts.length}</div>
          <div className="text-[11px] text-muted">{en ? "Posts" : "动态"}</div>
        </div>
        <div className="rounded-xl border border-line bg-surface px-3 py-2 text-center">
          <div className="text-lg font-semibold tabular-nums">{totalLikes}</div>
          <div className="text-[11px] text-muted">{en ? "Likes" : "点赞"}</div>
        </div>
        <div className="rounded-xl border border-line bg-surface px-3 py-2 text-center">
          <div className="text-lg font-semibold tabular-nums">
            {totalComments + totalCorrections}
          </div>
          <div className="text-[11px] text-muted">
            {en ? "Replies" : "互动"}
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-1">
        {(
          [
            ["posts", en ? "My posts" : "我发布的"],
            ["activity", en ? "Activity" : "收到的互动"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              tab === id
                ? "bg-ink text-background"
                : "text-muted hover:bg-surface-2"
            }`}
          >
            {label}
            {id === "activity" && activity.length > 0
              ? ` (${activity.length})`
              : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-8 text-sm text-muted">
          {en ? "Loading…" : "加载中…"}
        </div>
      ) : tab === "posts" ? (
        posts.length === 0 ? (
          <div className="mt-8 text-center text-sm text-muted">
            <p>{en ? "No moments yet." : "还没有发布过动态。"}</p>
            <Link
              href="/moments/compose"
              className="mt-3 inline-block text-accent"
            >
              {en ? "Write one →" : "去发一条 →"}
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {posts.map((p) => {
              const open = expanded === p.id;
              const nInteract = p.comments.length + p.corrections.length;
              return (
                <li
                  key={p.id}
                  className="rounded-2xl border border-line bg-surface p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {p.tag && (
                        <span className="text-[11px] text-accent">#{p.tag}</span>
                      )}
                      <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed">
                        {p.text}
                      </p>
                      <MediaThumb post={p} />
                      <div className="mt-2 text-xs text-muted">
                        {p.time} · ♥ {p.likes} · {en ? "comments" : "评论"}{" "}
                        {p.comments.length} · {en ? "fixes" : "纠错"}{" "}
                        {p.corrections.length}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void onDelete(p.id)}
                      className="shrink-0 text-xs text-muted hover:text-rose-500"
                    >
                      {en ? "Delete" : "删除"}
                    </button>
                  </div>

                  {nInteract > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : p.id)}
                      className="mt-3 text-xs font-medium text-accent"
                    >
                      {open
                        ? en
                          ? "Hide interactions"
                          : "收起互动"
                        : en
                          ? `View interactions (${nInteract})`
                          : `查看互动 (${nInteract})`}
                    </button>
                  )}

                  {open && (
                    <div className="mt-3 space-y-2 border-t border-line pt-3">
                      {p.comments.map((c, i) => (
                        <div key={`c-${i}`} className="text-sm">
                          <span className="font-medium">{c.by}</span>
                          <span className="text-muted">
                            {" "}
                            {en ? "commented" : "评论"}：
                          </span>
                          {c.text}
                        </div>
                      ))}
                      {p.corrections.map((c, i) => (
                        <div key={`x-${i}`} className="text-sm">
                          <span className="font-medium text-amber-700 dark:text-amber-300">
                            {c.by}
                          </span>
                          <span className="text-muted">
                            {" "}
                            {en ? "suggested" : "纠错"}：
                          </span>
                          {c.text}
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )
      ) : activity.length === 0 ? (
        <div className="mt-8 text-center text-sm text-muted">
          {en
            ? "No comments or corrections yet. Share on Moments to get replies."
            : "还没有评论或纠错。去动态页发帖，其他人互动后会出现在这里。"}
          <div className="mt-3">
            <Link href="/moments" className="text-accent">
              {en ? "Open Moments →" : "打开动态 →"}
            </Link>
          </div>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {activity.map((a) => (
            <li
              key={a.id}
              className="rounded-2xl border border-line bg-surface p-4"
            >
              <div className="text-xs text-muted">
                {a.kind === "comment"
                  ? en
                    ? "Comment"
                    : "评论"
                  : en
                    ? "Correction"
                    : "纠错"}{" "}
                · {a.postTime}
              </div>
              <p className="mt-1 text-sm">
                <span className="font-medium">{a.by}</span>
                <span className="text-muted">
                  {a.kind === "comment"
                    ? en
                      ? " replied to your moment"
                      : " 回复了你的动态"
                    : en
                      ? " suggested a fix"
                      : " 给你纠错"}
                </span>
              </p>
              <p className="mt-1 text-sm leading-relaxed">{a.text}</p>
              <p className="mt-2 truncate text-xs text-muted">
                {en ? "On" : "原文"}：{a.postPreview}
                {a.postPreview.length >= 48 ? "…" : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
