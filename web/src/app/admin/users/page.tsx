"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAdminI18n } from "@/lib/adminI18n";

type AdminUser = {
  id: string;
  name: string | null;
  handle: string | null;
  email: string | null;
  gender: string | null;
  age: number | null;
  country: string | null;
  city: string | null;
  plan: string | null;
  plan_expires_at: string | null;
  is_founder: boolean | null;
  founder_slot: number | null;
  verified: boolean | null;
  online: boolean | null;
  created_at: string | null;
  boost_until: string | null;
  referred_by_code: string | null;
  phone_e164: string | null;
  banned_at: string | null;
  ban_reason: string | null;
};

type Action =
  | "grant_vip_30"
  | "grant_vip_90"
  | "clear_vip"
  | "grant_founder"
  | "set_verified"
  | "clear_verified"
  | "ban"
  | "unban"
  | "delete";

function regionLabel(country: string | null, city: string | null) {
  const flag =
    country === "CN" ? "🇨🇳" : country === "US" ? "🇺🇸" : country || "—";
  const place = [country === "CN" ? "中国" : country === "US" ? "美国" : country, city]
    .filter(Boolean)
    .join(" · ");
  return { flag, place: place || "—" };
}

export default function AdminUsersPage() {
  const { t, locale } = useAdminI18n();
  const [q, setQ] = useState("");
  const [bannedFilter, setBannedFilter] = useState<"all" | "1" | "0">("all");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [authTotal, setAuthTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [purgeBusy, setPurgeBusy] = useState(false);
  const [purgeMsg, setPurgeMsg] = useState<string | null>(null);

  const load = useCallback(
    async (query = q, banned = bannedFilter) => {
      setLoading(true);
      setErr(null);
      try {
        const url = new URL("/api/admin/users", window.location.origin);
        if (query.trim()) url.searchParams.set("q", query.trim());
        if (banned !== "all") url.searchParams.set("banned", banned);
        const res = await fetch(url.toString());
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t.actionFail);
        setUsers(data.users || []);
        setAuthTotal(
          typeof data.auth_total === "number" ? data.auth_total : null
        );
      } catch (e) {
        setErr(e instanceof Error ? e.message : t.actionFail);
      } finally {
        setLoading(false);
      }
    },
    [q, bannedFilter, t.actionFail]
  );

  useEffect(() => {
    void load("", "all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    void load(q, bannedFilter);
  };

  const run = async (id: string, action: Action) => {
    if (action === "grant_founder" && !window.confirm(t.founderConfirm)) {
      return;
    }
    if (
      (action === "grant_vip_30" || action === "grant_vip_90") &&
      !window.confirm(t.confirmVip)
    ) {
      return;
    }
    if (action === "clear_vip" && !window.confirm(t.confirmClearVip)) {
      return;
    }
    if (action === "set_verified" && !window.confirm(t.confirmVerify)) {
      return;
    }
    if (action === "clear_verified" && !window.confirm(t.confirmUnverify)) {
      return;
    }
    let reason: string | undefined;
    if (action === "ban") {
      const input = window.prompt(t.banReasonPrompt, "");
      if (input === null) return;
      reason = input.trim() || "Policy violation";
    }
    if (action === "unban" && !window.confirm(t.unbanConfirm)) {
      return;
    }
    if (action === "delete" && !window.confirm(t.deleteConfirm)) {
      return;
    }
    setBusyId(id);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.actionFail);
      await load(q, bannedFilter);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.actionFail);
    } finally {
      setBusyId(null);
    }
  };

  const actions: [Action, string][] = [
    ["grant_vip_30", t.vip30],
    ["grant_vip_90", t.vip90],
    ["clear_vip", t.clearVip],
    ["grant_founder", t.founder],
    ["set_verified", t.verify],
    ["clear_verified", t.unverify],
  ];

  const purgeTests = async () => {
    const keep = ["4939761@qq.com", "2933363481@qq.com"];
    const ok = window.confirm(
      locale === "en"
        ? `Delete ALL auth users except:\n${keep.join("\n")}\n\nSoft-ban does NOT delete. This permanently deletes other test accounts. Continue?`
        : `将删除除以下账号外的所有注册用户：\n${keep.join("\n")}\n\n（封禁不会删除账号；此操作会永久删除其它测试账号。约 30 个虚拟人物不受影响。）\n确定继续？`
    );
    if (!ok) return;
    const typed = window.prompt(
      locale === "en"
        ? 'Type PURGE_TEST_USERS to confirm'
        : "请输入 PURGE_TEST_USERS 确认删除",
      ""
    );
    if (typed !== "PURGE_TEST_USERS") return;
    setPurgeBusy(true);
    setPurgeMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/admin/users/purge-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepEmails: keep, confirm: "PURGE_TEST_USERS" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.actionFail);
      setPurgeMsg(
        locale === "en"
          ? `Kept ${data.kept?.length ?? 0}, deleted ${data.deleted?.length ?? 0}, failed ${data.failed?.length ?? 0}.`
          : `已保留 ${data.kept?.length ?? 0}，删除 ${data.deleted?.length ?? 0}，失败 ${data.failed?.length ?? 0}。`
      );
      await load(q, bannedFilter);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.actionFail);
    } finally {
      setPurgeBusy(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold">{t.usersTitle}</h1>
      <p className="mt-1 text-sm text-zinc-400">
        {t.usersSub} {t.searchPhoneHint}
        {authTotal != null && (
          <span className="ml-2 text-zinc-500">
            · Auth {authTotal} / list {users.length}
          </span>
        )}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={purgeBusy}
          onClick={() => void purgeTests()}
          className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200 disabled:opacity-40"
        >
          {purgeBusy
            ? "…"
            : locale === "en"
              ? "Purge test users (keep 2 qq.com)"
              : "清理测试用户（保留 2 个 QQ 邮箱）"}
        </button>
        {purgeMsg && (
          <span className="text-xs text-emerald-300">{purgeMsg}</span>
        )}
      </div>

      <form onSubmit={onSearch} className="mt-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/30"
        />
        <select
          value={bannedFilter}
          onChange={(e) => {
            const v = e.target.value as "all" | "1" | "0";
            setBannedFilter(v);
            void load(q, v);
          }}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
        >
          <option value="all">{t.filterAll}</option>
          <option value="1">{t.filterBanned}</option>
          <option value="0">{t.filterActive}</option>
        </select>
        <button
          type="submit"
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
        >
          {t.search}
        </button>
      </form>

      {err && (
        <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {err}
        </div>
      )}

      {loading ? (
        <div className="mt-8 text-sm text-zinc-500">{t.loading}</div>
      ) : users.length === 0 ? (
        <div className="mt-8 text-sm text-zinc-500">{t.noUsers}</div>
      ) : (
        <div className="mt-4 space-y-3">
          {users.map((u) => {
            const reg = regionLabel(u.country, u.city);
            return (
              <div
                key={u.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 font-medium">
                      <span>{u.name || "—"}</span>
                      <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-normal text-sky-100">
                        {reg.flag} {locale === "zh" ? reg.place : `${u.country || "—"} · ${u.city || ""}`}
                      </span>
                      <span className="text-xs font-normal text-zinc-500">
                        {u.gender}/{u.age ?? "?"}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-400">
                      {u.email || t.noEmail} · {u.id.slice(0, 8)}…
                    </div>
                    <div className="mt-1 text-xs text-zinc-300">
                      {t.phone}:{" "}
                      <span className="font-mono">
                        {u.phone_e164 || t.noPhone}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                      <span className="rounded-full bg-white/10 px-2 py-0.5">
                        {t.plan}: {u.plan || "free"}
                        {u.plan_expires_at
                          ? ` → ${u.plan_expires_at.slice(0, 10)}`
                          : ""}
                      </span>
                      {u.is_founder && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-200">
                          Founder #{u.founder_slot}
                        </span>
                      )}
                      {u.verified && (
                        <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-sky-200">
                          {t.verified}
                        </span>
                      )}
                      {u.online && (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-200">
                          {t.online}
                        </span>
                      )}
                      {u.banned_at && (
                        <span className="rounded-full bg-rose-500/25 px-2 py-0.5 text-rose-200">
                          {t.banned}
                          {u.ban_reason ? `: ${u.ban_reason}` : ""}
                        </span>
                      )}
                      {u.referred_by_code && (
                        <span className="rounded-full bg-white/10 px-2 py-0.5">
                          {t.ref}: {u.referred_by_code}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-[11px] text-zinc-500">
                      {u.created_at?.slice(0, 10)}
                    </div>
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="rounded-lg border border-white/20 px-2.5 py-1 text-xs text-white hover:bg-white/10"
                    >
                      {t.detail} →
                    </Link>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {actions.map(([action, label]) => (
                    <button
                      key={action}
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => run(u.id, action)}
                      className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-40"
                    >
                      {label}
                    </button>
                  ))}
                  {u.banned_at ? (
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => run(u.id, "unban")}
                      className="rounded-lg border border-emerald-500/40 px-2.5 py-1 text-xs text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-40"
                    >
                      {t.unban}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => run(u.id, "ban")}
                      className="rounded-lg border border-rose-500/40 px-2.5 py-1 text-xs text-rose-200 hover:bg-rose-500/10 disabled:opacity-40"
                    >
                      {t.ban}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyId === u.id}
                    onClick={() => run(u.id, "delete")}
                    className="rounded-lg border border-rose-600/50 bg-rose-600/15 px-2.5 py-1 text-xs font-medium text-rose-100 hover:bg-rose-600/25 disabled:opacity-40"
                  >
                    {t.deleteUser}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
