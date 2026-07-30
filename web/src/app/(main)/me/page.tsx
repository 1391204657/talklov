"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { ChineseVariant, PhotoPrivacy } from "@/lib/types";
import { CompletenessBar } from "@/components/ProfileForm";
import MeAvatarButton from "@/components/MeAvatarButton";
import { tApp } from "@/lib/appCopy";
import { notificationPermission, playMessageSound } from "@/lib/notify";
import {
  DATING_SCENE_ID,
  formatLearnDate,
  loadLearnRecords,
  type LearnRecord,
} from "@/lib/datingSim";

const CHINESE_VARIANT_OPTIONS: [ChineseVariant, string, string][] = [
  ["mandarin", "普通话", "Mandarin"],
  ["cantonese", "粤语", "Cantonese"],
];

function ComingSoonRow({
  icon,
  label,
  subtitle,
  soon,
}: {
  icon: string;
  label: string;
  subtitle?: string;
  soon: string;
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
      <span className="shrink-0 text-xs text-muted">{soon}</span>
    </div>
  );
}

function ToggleRow({
  title,
  desc,
  on,
  onToggle,
  status,
}: {
  title: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
  status: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-start justify-between gap-3 border-t border-line px-4 py-3 text-left first:border-t-0"
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="mt-0.5 text-xs leading-relaxed text-muted">{desc}</div>
      </div>
      <span
        className={`mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
          on ? "bg-accent/15 text-accent" : "bg-surface-2 text-muted"
        }`}
      >
        {status}
      </span>
    </button>
  );
}

function Stars({ n }: { n: number }) {
  const s = Math.max(0, Math.min(5, n));
  return (
    <span className="text-amber-500">
      {"★".repeat(s)}
      <span className="text-muted">{"★".repeat(5 - s)}</span>
    </span>
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
    notifyPrefs,
    setNotifyPrefs,
  } = useApp();

  const c = tApp(locale);
  // If session/phone exists but local tier lagged as guest, treat as logged-in
  const effectiveTier =
    tier === "verified"
      ? "verified"
      : tier === "light" || !!userId || !!myProfile.phoneE164
        ? "light"
        : "guest";
  const tierMeta =
    effectiveTier === "verified"
      ? { label: c.tierVerified, color: "text-success" }
      : effectiveTier === "light"
        ? { label: c.tierLight, color: "text-accent-2" }
        : { label: c.tierGuest, color: "text-muted" };
  const avatar = myProfile.photos[0];
  const chineseVariants = myProfile.chineseVariants ?? [];
  const showChineseVariants = myProfile.nativeLang === "中文";
  const [notifyErr, setNotifyErr] = useState<string | null>(null);
  const [learnRecords, setLearnRecords] = useState<LearnRecord[]>([]);

  useEffect(() => {
    setLearnRecords(loadLearnRecords());
  }, []);

  const privacyOptions: { id: PhotoPrivacy; label: string; desc: string }[] = [
    { id: "public", label: c.privacyPublic, desc: c.privacyPublicDesc },
    { id: "loggedIn", label: c.privacyLoggedIn, desc: c.privacyLoggedInDesc },
    { id: "verified", label: c.privacyVerified, desc: c.privacyVerifiedDesc },
  ];

  const toggleChineseVariant = (id: ChineseVariant) => {
    const on = chineseVariants.includes(id);
    updateMyProfile({
      chineseVariants: on
        ? chineseVariants.filter((v) => v !== id)
        : [...chineseVariants, id],
    });
  };

  const togglePush = async () => {
    setNotifyErr(null);
    if (notifyPrefs.push) {
      await setNotifyPrefs({ push: false });
      return;
    }
    const res = await setNotifyPrefs({ push: true });
    if (!res.ok) setNotifyErr(c.notifyDenied);
  };

  const toggleBadge = async () => {
    await setNotifyPrefs({ badge: !notifyPrefs.badge });
  };

  const toggleSound = async () => {
    const next = !notifyPrefs.sound;
    await setNotifyPrefs({ sound: next });
    if (next) playMessageSound(true);
  };

  return (
    <main>
      <header className="mb-1 flex items-center justify-end px-4 pt-3">
        <MeAvatarButton />
      </header>
      <div className="space-y-4 px-4 pb-4">
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
                  {myProfile.name || c.guestUser}
                </span>
                {effectiveTier === "verified" && (
                  <span className="rounded-full bg-accent-2/15 px-2 py-0.5 text-[11px] font-medium text-accent-2">
                    ✓
                  </span>
                )}
              </div>
              <div className={`mt-0.5 text-xs ${tierMeta.color}`}>
                {tierMeta.label}
              </div>
            </div>
          </div>

          {effectiveTier !== "guest" && (
            <div className="mt-4">
              <CompletenessBar
                profile={myProfile}
                verified={effectiveTier === "verified"}
              />
            </div>
          )}

          {/* Guest → register; logged-in → verify; verified → no CTA */}
          {effectiveTier === "guest" && (
            <button
              onClick={() => openRegister()}
              className="btn-grad mt-4 w-full rounded-xl py-2.5 text-sm font-semibold"
            >
              {c.registerLogin}
            </button>
          )}
          {effectiveTier === "light" && (
            <button
              onClick={() => openVerify()}
              className="btn-grad mt-4 w-full rounded-xl py-2.5 text-sm font-semibold"
            >
              {c.goVerify}
            </button>
          )}

          {effectiveTier !== "guest" && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href={userId ? `/profile/${userId}` : "/profile/me"}
                className="rounded-xl border border-line py-2.5 text-center text-sm font-medium"
              >
                {locale === "en" ? "Preview profile" : "预览我的主页"}
              </Link>
              <Link
                href="/me/edit"
                className="rounded-xl border border-line py-2.5 text-center text-sm font-medium"
              >
                {locale === "en" ? "Edit profile" : "编辑资料"}
              </Link>
            </div>
          )}
          {effectiveTier !== "guest" && (
            <Link
              href="/me/membership"
              className="mt-2 flex items-center justify-between rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-400/10 px-3 py-2.5"
            >
              <span className="text-sm font-semibold">
                {locale === "en" ? "Membership & VIP" : "会员与 VIP"}
              </span>
              <span className="text-xs text-amber-800/80">
                {locale === "en" ? "Plans →" : "查看方案 →"}
              </span>
            </Link>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold">
              📚 {locale === "en" ? "Lianyu log" : "练遇记录"}
            </div>
            <Link href="/learn" className="text-xs text-accent">
              {locale === "en" ? "Go to Lianyu" : "去练遇"}
            </Link>
          </div>

          {learnRecords.length === 0 ? (
            <div className="mt-3 rounded-xl bg-surface-2/80 px-3 py-4 text-center text-sm text-muted">
              {locale === "en"
                ? "Finish a dating icebreaker scene to unlock your first badge here."
                : "完成一次「美式约会破冰」后，通关勋章会显示在这里。"}
              <div className="mt-3">
                <Link
                  href={`/learn?practice=${DATING_SCENE_ID}`}
                  className="inline-flex rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-white"
                >
                  {locale === "en" ? "Start scene 1" : "开始场景 1"}
                </Link>
              </div>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {learnRecords.slice(0, 8).map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-line bg-background/60 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{r.sceneTitle}</div>
                      <div className="mt-0.5 text-[11px] text-muted">
                        {formatLearnDate(r.completedAt, locale)}
                      </div>
                    </div>
                    <Stars n={r.stars} />
                  </div>
                  {r.bestLine ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">
                      「{r.bestLine}」
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                    <span>
                      {locale === "en" ? "Natural" : "自然"} {r.naturalness}%
                    </span>
                    <span>
                      {locale === "en" ? "Polite" : "礼貌"} {r.politeness}%
                    </span>
                    <span>
                      {locale === "en" ? "Vibe" : "合适度"} {r.vibe}%
                    </span>
                  </div>
                  <div className="mt-2.5 flex gap-2">
                    <Link
                      href={`/learn?practice=${r.sceneId}`}
                      className="rounded-full border border-line px-3 py-1 text-[11px] font-medium"
                    >
                      {locale === "en" ? "Practice again" : "再练一次"}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="px-4 py-3 font-semibold">🔔 {c.notifyTitle}</div>
          <ToggleRow
            title={c.notifyPush}
            desc={c.notifyPushDesc}
            on={notifyPrefs.push && notificationPermission() === "granted"}
            status={
              notifyPrefs.push && notificationPermission() === "granted"
                ? c.notifyOn
                : c.notifyOff
            }
            onToggle={togglePush}
          />
          <ToggleRow
            title={c.notifyBadge}
            desc={c.notifyBadgeDesc}
            on={notifyPrefs.badge}
            status={notifyPrefs.badge ? c.notifyOn : c.notifyOff}
            onToggle={toggleBadge}
          />
          <ToggleRow
            title={c.notifySound}
            desc={c.notifySoundDesc}
            on={notifyPrefs.sound}
            status={notifyPrefs.sound ? c.notifyOn : c.notifyOff}
            onToggle={toggleSound}
          />
          {notifyErr && (
            <p className="border-t border-line px-4 py-2 text-xs text-danger">
              {notifyErr}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="font-semibold">🌐 {c.langRegion}</div>
          <div className="mt-3">
            <div className="text-xs text-muted">{c.uiLanguage}</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(
                [
                  { id: "zh" as const, label: "中文" },
                  { id: "en" as const, label: "English" },
                ]
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
              <div className="text-xs text-muted">{c.chineseVariants}</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {CHINESE_VARIANT_OPTIONS.map(([id, zh, en]) => {
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
                      {locale === "en" ? en : zh}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="font-semibold">🎨 {c.appearance}</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(
              [
                { id: "light" as const, label: `☀️ ${c.light}` },
                { id: "dark" as const, label: `🌙 ${c.dark}` },
              ]
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
            <div className="font-semibold">📷 {c.photoPrivacy}</div>
            <p className="mt-1 text-xs text-muted">{c.photoPrivacyHint}</p>
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
            🛡️ {c.privacySecurity}
          </div>
          {myProfile.phoneE164 ? (
            <div className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm">📱 {c.phoneBound}</div>
                <div className="mt-0.5 text-xs text-muted">
                  {myProfile.phoneE164} · {c.phoneBoundHint}
                </div>
              </div>
              <span className="shrink-0 text-xs text-success">{c.phoneBoundOk}</span>
            </div>
          ) : (
            <ComingSoonRow
              icon="📱"
              label={c.phoneBound}
              subtitle={c.phoneNeedLogin}
              soon={c.comingSoon}
            />
          )}
          <div className="border-t border-line">
            <ComingSoonRow
              icon="✉️"
              label={c.emailBind}
              subtitle={c.emailBindHint}
              soon={c.comingSoon}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="border-b border-line px-4 py-3 font-semibold">
            📜 {c.legalTitle}
          </div>
          <Link
            href="/terms"
            className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-2/50"
          >
            <span>{c.terms}</span>
            <span className="text-muted">›</span>
          </Link>
          <Link
            href="/privacy"
            className="flex items-center justify-between border-t border-line px-4 py-3 text-sm hover:bg-surface-2/50"
          >
            <span>{c.privacy}</span>
            <span className="text-muted">›</span>
          </Link>
        </div>

        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          <ComingSoonRow icon="🚫" label={c.blacklist} soon={c.comingSoon} />
          <ComingSoonRow icon="💎" label={c.membership} soon={c.comingSoon} />
        </div>

        {configured && tier !== "guest" && (
          <button
            onClick={() => signOut()}
            className="w-full rounded-xl border border-line py-2.5 text-sm text-muted"
          >
            {c.signOut}
          </button>
        )}

        <button
          onClick={reset}
          className="w-full rounded-xl border border-line py-2.5 text-xs text-muted"
        >
          {c.resetDemo}
        </button>
      </div>
    </main>
  );
}
