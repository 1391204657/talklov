"use client";

import { profiles } from "@/lib/mockData";

const posts = [
  {
    id: "p1",
    author: "lin",
    time: "2 小时前",
    text: "今天第一次用英语点了咖啡，店员居然听懂了！求纠错：\n“Can I get a oat milk latte, less sweet?”",
    correction: "a → an（an oat milk latte）",
    likes: 24,
    comments: 8,
  },
  {
    id: "p2",
    author: "jack",
    time: "5 小时前",
    text: "学了一个新词：“接地气”。My Chinese teacher says it means down-to-earth. 用对了吗？😄",
    likes: 41,
    comments: 15,
  },
  {
    id: "p3",
    author: "shan",
    time: "昨天",
    text: "广州早茶約嗎？想认识喜欢美食的外国朋友一起练英语～ 🥟",
    likes: 33,
    comments: 12,
  },
];

export default function Moments() {
  return (
    <main>
      <header className="sticky top-0 z-20 flex items-center justify-end bg-background/90 px-4 py-2 backdrop-blur">
        <button className="btn-grad rounded-full px-4 py-1.5 text-sm font-medium">
          + 发帖
        </button>
      </header>
      <ul className="space-y-3 px-4 pb-4 pt-1">
        {posts.map((post) => {
          const a = profiles.find((p) => p.id === post.author)!;
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
              {post.correction && (
                <div className="mt-2 rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm">
                  <span className="text-success">✍️ 母语者纠错：</span>
                  <span className="text-muted">{post.correction}</span>
                </div>
              )}
              <div className="mt-3 flex gap-5 text-sm text-muted">
                <button>❤️ {post.likes}</button>
                <button>💬 {post.comments}</button>
                <button>✍️ 帮TA纠错</button>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
