"use client";

import { useApp } from "@/lib/store";
import { tApp } from "@/lib/appCopy";

function DefaultAvatarIcon() {
  return (
    <span className="flex h-full w-full items-center justify-center bg-[#e4e4e7]">
      <svg
        viewBox="0 0 24 24"
        className="h-[58%] w-[58%] text-[#a1a1aa]"
        fill="currentColor"
        aria-hidden
      >
        <circle cx="12" cy="8" r="3.6" />
        <path d="M5.2 18.8c1.5-3.2 4.2-4.8 6.8-4.8s5.3 1.6 6.8 4.8c.2.4 0 .9-.5.9H5.7c-.5 0-.7-.5-.5-.9Z" />
      </svg>
    </span>
  );
}

/** Top-right profile entry — person silhouette by default; swaps to uploaded photo. */
export default function MeAvatarButton({ className = "" }: { className?: string }) {
  const { locale, myProfile, tier, userId, openRegister } = useApp();
  const c = tApp(locale);
  const avatar = myProfile.photos[0];
  const loggedIn =
    tier !== "guest" || !!userId || !!myProfile.phoneE164;

  const face = (
    <span
      className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-black/5 shadow-sm ${className}`}
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="h-full w-full object-cover" />
      ) : (
        <DefaultAvatarIcon />
      )}
    </span>
  );

  if (!loggedIn) {
    return (
      <button
        type="button"
        onClick={() => openRegister()}
        className="shrink-0 rounded-full"
        aria-label={c.registerLogin}
        style={{ touchAction: "manipulation" }}
      >
        {face}
      </button>
    );
  }

  return (
    <a
      href="/me"
      className="shrink-0 rounded-full"
      aria-label={c.tabMe}
      title={myProfile.name || c.tabMe}
      style={{ touchAction: "manipulation" }}
    >
      {face}
    </a>
  );
}
