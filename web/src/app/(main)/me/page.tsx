"use client";

import Link from "next/link";
import { useApp } from "@/lib/store";
import { ChineseVariant, PhotoPrivacy } from "@/lib/types";
import { CompletenessBar } from "@/components/ProfileForm";
import { profileCompleteness } from "@/lib/profile";

const tierLabel: Record<string, { label: string; color: string; }> = {
  guest: { label: "游客（未注册）", color: "text-muted" },
  light: { label: "轻账号（已注册）", color: "text-accent-2" },
  verified: { label: "已真人认证", color: "text-success" },
};

const privacyOptions: { id: PhotoPrivacy; label: string; desc: string; }[] = [
  {
    id: "public",
    label: "所有人可见",
    desc: "包括未注册游客（默认，曝光最高）",
  },
  {
    id: "loggedIn",
    label: "仅登录用户可见",
    desc: "游客看到的是模糊图",
  },
  {
    id: "verified",
    label: "仅认证用户可见",
    desc: "最谨慎，只有通过真人认证的人能看",
  },
];

const CHINESE_VARIANT_OPTIONS: [ChineseVariant, string][] = [
  ["mandarin", "普通话"],
  ["cantonese", "粤语"],
];

function ComingSoonRow({
  icon,
  label,
  subtitle,
}: {
  icon: string;
  label: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 opacity-60">
      <div className="min-w-0 flex-1">
        <div className="text-sm">
          {icon} {label}
        </div>
        {subtitle && (
          <div className="mt-0.5 text-xs text-muted">{subtitle}</div>
        )}
      </div>
      <span className="shrink-0 text-xs text-muted">即将推出</span>
    </div>
  );
}

export default function Me() {
  const {
    tier,
    theme,
    locale,
    myProfile,
    userId,
    openRegister,
    openVerify,
    setPhotoPrivacy,
    setTheme,
    setLocale,
    updateMyProfile,
    reset,
    signOut,
    configured,
  } = useApp();

  const t = tierLabel[tier];
  const { percent } = profileCompleteness(myProfile, tier === "verified");
  const avatar = myProfile.photos[0];
  const chineseVariants = myProfile.chineseVariants ?? [];
  const showChineseVariants = myProfile.nativeLang === "中文";

  const toggleChineseVariant = (id: ChineseVariant) => {
    const on = chineseVariants.includes(id);
    updateMyProfile({
      chineseVariants: on
        ? chineseVariants.filter((v) => v !== id)
        : [...chineseVariants, id],
    });
  };

  return (
    <main>
      <div className="space-y-4 p-4 pt-3">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center gap-3">
            <div
              className="btn-grad flex h-14 w-14 items-center justify-center overflow-hidden rounded-full text-2xl font-bold"
              style={
                avatar
                  ? {
                      backgroundImage: `url(${avatar})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : undefined
              }
            >
              {!avatar && (myProfile.name ? myProfile.name.charAt(0) : "?")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold">
                  {myProfile.name || "未注册用户"}
                </span>
                {tier === "verified" && (
                  <span className="rounded-full bg-accent-2/15 px-2 py-0.5 text-[11px] font-medium text-accent-2">
                    ✓ 已认证
                  </span>
                )}
              </div>
              <div className={`text-sm ${t.color}`}>● {t.label}</div>
              {myProfile.city && (
                <div className="text-xs text-muted">
                  {myProfile.city}
                  {myProfile.occupation ? ` · ${myProfile.occupation}` : ""}
                </div>
              )}
            </div>
          </div>

          {tier !== "guest" && (
            <div className="mt-4">
              <CompletenessBar
                profile={myProfile}
                verified={tier === "verified"}
              />
            </div>
          )}

          {tier === "guest" && (
            <button
              onClick={() => openRegister("完善你的资料")}
              className="btn-grad mt-4 w-full rounded-xl py-2.5 text-sm font-semibold"
            >
              注册 / 登录
            </button>
          )}

          {tier !== "guest" && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {tier === "light" && (
                <button
                  onClick={() => openVerify()}
                  className="col-span-2 rounded-xl border border-success/40 bg-success/10 py-2.5 text-sm font-semibold text-success"
                >
                  🛡️ 真人认证
                </button>
              )}
              <Link
                href={userId ? `/profile/${userId}` : "/profile/me"}
                className="rounded-xl border border-line py-2.5 text-center text-sm font-medium"
              >
                预览我的主页
              </Link>
              <Link
                href="/me/edit"
                className="rounded-xl border border-line py-2.5 text-center text-sm font-medium"
              >
                编辑资料{percent < 90 ? " · 去完善" : ""}
              </Link>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="font-semibold">🌐 语言与地区</div>
          <div className="mt-3">
            <div className="text-xs text-muted">界面语言</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(
                [
                  { id: "zh", label: "中文" },
                  { id: "en", label: "English" },
                ] as const
              ).map((o) => (
                <button
                  key={o.id}
                  onClick={() => setLocale(o.id)}
                  className={`rounded-xl border py-2.5 text-sm ${
                    locale === o.id
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-line text-muted"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          {showChineseVariants && (
            <div className="mt-4">
              <div className="text-xs text-muted">中文变体（可多选）</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {CHINESE_VARIANT_OPTIONS.map(([id, label]) => {
                  const on = chineseVariants.includes(id);
                  return (
                    <button
                      key={id}
                      onClick={() => toggleChineseVariant(id)}
                      className={`rounded-xl border py-2.5 text-sm ${
                        on
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-line text-muted"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="font-semibold">🎨 外观主题</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(
              [
                { id: "light", label: "☀️ 浅色" },
                { id: "dark", label: "🌙 深色" },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                onClick={() => setTheme(o.id)}
                className={`rounded-xl border py-2.5 text-sm ${
                  theme === o.id
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-line text-muted"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {tier !== "guest" && (
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="font-semibold">📷 照片可见范围</div>
            <p className="mt-1 text-xs text-muted">
              控制谁能看到你的清晰照片。信任等级越高，可见范围越可收紧。
            </p>
            <div className="mt-3 space-y-2">
              {privacyOptions.map((o) => {
                const active = myProfile.photoPrivacy === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => setPhotoPrivacy(o.id)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left ${
                      active ? "border-accent bg-accent/10" : "border-line"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
                        active
                          ? "border-accent bg-accent text-white"
                          : "border-line"
                      }`}
                    >
                      {active && "✓"}
                    </span>
                    <span>
                      <span className="text-sm font-medium">{o.label}</span>
                      <span className="block text-xs text-muted">{o.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="border-b border-line px-4 py-3 font-semibold">
            🛡️ 隐私与安全
          </div>
          {myProfile.phoneE164 ? (
            <div className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm">📱 登录手机号</div>
                <div className="mt-0.5 text-xs text-muted">
                  {myProfile.phoneE164} · 一号一账号
                </div>
              </div>
              <span className="shrink-0 text-xs text-success">已绑定</span>
            </div>
          ) : (
            <ComingSoonRow
              icon="📱"
              label="登录手机号"
              subtitle="请用手机验证码登录 / 注册"
            />
          )}
          <div className="border-t border-line">
            <ComingSoonRow
              icon="✉️"
              label="绑定邮箱（可选）"
              subtitle="用于找回与通知 · 绑定后需验证邮箱"
            />
          </div>
        </div>

        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          <ComingSoonRow icon="🚫" label="黑名单 / 举报记录" />
          <ComingSoonRow icon="💎" label="会员订阅" />
        </div>

        {configured && tier !== "guest" && (
          <button
            onClick={() => signOut()}
            className="w-full rounded-xl border border-line py-2.5 text-sm text-muted"
          >
            退出登录
          </button>
        )}

        <button
          onClick={reset}
          className="w-full rounded-xl border border-line py-2.5 text-xs text-muted"
        >
          （演示）重置为游客状态
        </button>
      </div>
    </main>
  );
}
