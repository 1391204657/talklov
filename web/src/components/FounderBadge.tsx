"use client";

/** Founder / OG badge — gold ring + label. Grey when soft-frozen. */
export default function FounderBadge({
  slot,
  frozen = false,
  size = "md",
  locale = "zh",
}: {
  slot?: number | null;
  frozen?: boolean;
  size?: "sm" | "md";
  locale?: string;
}) {
  const en = locale === "en";
  const label =
    slot != null
      ? en
        ? `Founder #${slot}`
        : `创世 #${slot}`
      : en
        ? "Founder"
        : "创世成员";

  const pad = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${pad} ${
        frozen
          ? "bg-black/10 text-muted"
          : "bg-gradient-to-r from-amber-500/20 to-orange-400/20 text-amber-800"
      }`}
      title={
        frozen
          ? en
            ? "Founder inactive — VIP paused. Open the app to restore."
            : "创世身份暂缓权益（长期未登录）。打开 App 可恢复。"
          : en
            ? "TalkLov seed Founder — lifetime VIP"
            : "TalkLov 创世成员 · 终身 VIP"
      }
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          frozen ? "bg-muted" : "bg-amber-500 shadow-[0_0_0_2px_rgba(245,158,11,0.35)]"
        }`}
        aria-hidden
      />
      {label}
    </span>
  );
}

/** Avatar ring for Founders */
export function FounderAvatarRing({
  frozen = false,
  children,
  className = "",
}: {
  frozen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-full p-[2px] ${
        frozen
          ? "bg-black/15"
          : "bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400"
      } ${className}`}
    >
      <div className="rounded-full bg-surface p-[1px]">{children}</div>
    </div>
  );
}
