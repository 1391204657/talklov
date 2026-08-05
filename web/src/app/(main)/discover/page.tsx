"use client";

import { useEffect, useMemo, useState } from "react";
import ProfileCard from "@/components/ProfileCard";
import MeAvatarButton from "@/components/MeAvatarButton";
import { isUuid, useProfiles } from "@/lib/useProfiles";
import { useApp } from "@/lib/store";
import {
  HIDE_ACTIVE_CHATS_FROM_DISCOVER,
  listActiveChatPartnerIds,
} from "@/lib/localInbox";

const filters = [
  { id: "all", label: "全部" },
  { id: "CN", label: "🇨🇳 中国" },
  { id: "US", label: "🇺🇸 美国" },
  { id: "online", label: "在线" },
];

export default function Discover() {
  const [filter, setFilter] = useState("all");
  const { profiles, loading } = useProfiles();
  const { closeModals, registerOpen, verifyOpen } = useApp();

  // iPhone Safari: leftover auth sheet can sit invisible and eat all taps
  useEffect(() => {
    if (registerOpen || verifyOpen) closeModals();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount
  }, []);

  const activeIds = useMemo(() => {
    if (!HIDE_ACTIVE_CHATS_FROM_DISCOVER) return new Set<string>();
    return new Set(listActiveChatPartnerIds());
  }, [profiles, filter]);

  const list = profiles.filter((p) => {
    if (
      HIDE_ACTIVE_CHATS_FROM_DISCOVER &&
      activeIds.has(p.id) &&
      isUuid(p.id)
    ) {
      return false;
    }
    if (filter === "CN") return p.country === "CN";
    if (filter === "US") return p.country === "US";
    if (filter === "online") return p.online;
    return true;
  });

  return (
    <main>
      {/* Solid sticky header — backdrop-blur can eat taps on some iPhone WebViews */}
      <header className="sticky top-0 z-20 bg-background px-4 pt-3 pb-2">
        <div className="flex items-center gap-3">
          <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pr-1">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition ${
                  filter === f.id
                    ? "bg-accent/15 font-medium text-accent shadow-sm"
                    : "glass text-muted"
                }`}
                style={{ touchAction: "manipulation" }}
              >
                {f.id === "online" ? (
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-success align-middle" />
                ) : null}
                {f.label}
              </button>
            ))}
          </div>
          <MeAvatarButton className="shrink-0" />
        </div>
      </header>

      {loading && list.length > 0 ? (
        <div className="px-4 pb-1 text-[11px] text-muted">同步中…</div>
      ) : null}
      {list.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted">
          {loading
            ? "加载中…"
            : "还没有用户，快去邀请第一批种子用户吧～"}
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
