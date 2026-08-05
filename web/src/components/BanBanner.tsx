"use client";

import { useApp } from "@/lib/store";

/** Sticky notice when the signed-in account is soft-banned. */
export default function BanBanner() {
  const { isBanned, banReason, locale, signOut } = useApp();
  if (!isBanned) return null;
  const en = locale === "en";

  return (
    <div className="sticky top-0 z-[60] border-b border-rose-500/30 bg-rose-600 px-4 py-2.5 text-center text-sm text-white">
      <p className="font-medium">
        {en
          ? "Your account is restricted."
          : "你的账号已被限制使用。"}
      </p>
      {banReason && (
        <p className="mt-0.5 text-xs text-white/85">
          {en ? "Reason: " : "原因："}
          {banReason}
        </p>
      )}
      <p className="mt-1 text-xs text-white/80">
        {en
          ? "You can’t hello, chat, or interact until this is lifted. Contact support if you believe this is a mistake."
          : "在解除限制前，无法打招呼、聊天或互动。如有疑问请联系客服。"}
      </p>
      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-2 rounded-full bg-white/15 px-3 py-1 text-xs underline-offset-2 hover:bg-white/25"
      >
        {en ? "Sign out" : "退出登录"}
      </button>
    </div>
  );
}
