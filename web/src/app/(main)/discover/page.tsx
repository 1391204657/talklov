"use client";

import { useState } from "react";
import ProfileCard from "@/components/ProfileCard";
import { useApp } from "@/lib/store";
import { useProfiles } from "@/lib/useProfiles";

const filters = [
  { id: "all", label: "全部" },
  { id: "CN", label: "🇨🇳 中国" },
  { id: "US", label: "🇺🇸 美国" },
  { id: "online", label: "在线" },
];

export default function Discover() {
  const { tier } = useApp();
  const [filter, setFilter] = useState("all");
  const { profiles, loading } = useProfiles();

  const list = profiles.filter((p) => {
    if (filter === "CN") return p.country === "CN";
    if (filter === "US") return p.country === "US";
    if (filter === "online") return p.online;
    return true;
  });

  return (
    <main>
      {/* Compact filter strip — no page title (tab bar already says 发现) */}
      <header className="sticky top-0 z-20 bg-background/70 px-4 pt-3 pb-2 backdrop-blur-xl">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition ${
                filter === f.id
                  ? "bg-accent/15 font-medium text-accent shadow-sm"
                  : "glass text-muted"
              }`}
            >
              {f.id === "online" ? (
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-success align-middle" />
              ) : null}
              {f.label}
            </button>
          ))}
          {tier === "guest" && (
            <span className="ml-auto shrink-0 rounded-full border border-line px-2.5 py-1 text-[11px] text-muted">
              游客
            </span>
          )}
        </div>
      </header>

      {loading ? (
        <div className="p-10 text-center text-sm text-muted">加载中…</div>
      ) : list.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted">
          还没有用户，快去邀请第一批种子用户吧～
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-3 pb-6 pt-1">
          {list.map((p) => (
            <ProfileCard key={p.id} profile={p} />
          ))}
        </div>
      )}
    </main>
  );
}
