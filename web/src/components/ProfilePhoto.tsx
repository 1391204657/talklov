"use client";

import { useRef, useState } from "react";
import { Profile } from "@/lib/types";
import { useApp } from "@/lib/store";

interface Props {
  profile: Profile;
  className?: string;
  rounded?: string;
  showWatermark?: boolean;
  /** Allow left/right swipe between photos (default true). */
  swipeable?: boolean;
  /** Where to place photo-count bars. Profile page uses bottom short bars. */
  segments?: "top" | "bottom";
}

export function usePhotoVisible(privacy: Profile["photoPrivacy"]) {
  const { tier } = useApp();
  // Testing period: always show clear photos so uploaded & mock faces are visible.
  if (process.env.NEXT_PUBLIC_TEST_SHOW_PHOTOS !== "0") return true;
  if (privacy === "public") return true;
  if (privacy === "loggedIn") return tier === "light" || tier === "verified";
  if (privacy === "verified") return tier === "verified";
  return true;
}

function galleryOf(profile: Profile): string[] {
  if (profile.photos?.length) return profile.photos;
  return profile.photo ? [profile.photo] : [];
}

export default function ProfilePhoto({
  profile,
  className = "",
  rounded = "rounded-2xl",
  showWatermark = true,
  swipeable = true,
  segments = "top",
}: Props) {
  const [err, setErr] = useState(false);
  const [idx, setIdx] = useState(0);
  const startX = useRef<number | null>(null);
  const moved = useRef(false);
  const visible = usePhotoVisible(profile.photoPrivacy);
  const gallery = galleryOf(profile);
  const count = Math.max(gallery.length, 1);
  const src = gallery[Math.min(idx, count - 1)] ?? "";

  const gradient =
    profile.gender === "female"
      ? "linear-gradient(145deg,#f9c5d1,#c4b5fd,#a5b4fc)"
      : "linear-gradient(145deg,#a5b4fc,#99f6e4,#93c5fd)";

  const go = (next: number) => {
    if (count <= 1) return;
    setIdx((next + count) % count);
    setErr(false);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!swipeable || count <= 1) return;
    startX.current = e.clientX;
    moved.current = false;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (startX.current == null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) < 28) return;
    moved.current = true;
    e.preventDefault();
    e.stopPropagation();
    go(dx < 0 ? idx + 1 : idx - 1);
  };

  const onClickCapture = (e: React.MouseEvent) => {
    // Tap left/right thirds to change photo (dating-app style), without navigating.
    if (!swipeable || count <= 1) return;
    if (moved.current) {
      e.preventDefault();
      e.stopPropagation();
      moved.current = false;
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.28) {
      e.preventDefault();
      e.stopPropagation();
      go(idx - 1);
    } else if (x > rect.width * 0.72) {
      e.preventDefault();
      e.stopPropagation();
      go(idx + 1);
    }
  };

  return (
    <div
      className={`relative overflow-hidden touch-pan-y ${rounded} ${className}`}
      style={{ background: gradient }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        startX.current = null;
      }}
      onClickCapture={onClickCapture}
    >
      {!err && src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={profile.name}
          draggable={false}
          onError={() => setErr(true)}
          className={`h-full w-full select-none object-cover transition ${
            visible ? "" : "scale-110 blur-2xl"
          }`}
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-5xl font-bold text-white/90">
          {profile.name.charAt(0)}
        </div>
      )}

      {/* Segment indicators */}
      {swipeable && count > 1 && segments === "top" && (
        <div className="pointer-events-none absolute inset-x-3 top-2.5 z-10 flex gap-1">
          {gallery.map((_, i) => (
            <span
              key={i}
              className={`h-[2.5px] flex-1 rounded-full transition-colors ${
                i === idx ? "bg-white" : "bg-white/35"
              }`}
            />
          ))}
        </div>
      )}
      {swipeable && count > 1 && segments === "bottom" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3.5 z-10 flex items-center justify-center gap-1.5">
          {gallery.map((_, i) => (
            <span
              key={i}
              className={`h-[3px] w-7 rounded-full transition-colors ${
                i === idx ? "bg-white" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      )}

      {showWatermark && visible && (
        <div className="pointer-events-none absolute bottom-1 right-1.5">
          <span className="text-[10px] font-medium tracking-wide text-white/35 drop-shadow">
            TalkLov
          </span>
        </div>
      )}

      {!visible && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30 px-4 text-center">
          <span className="text-2xl">🔒</span>
          <span className="text-xs leading-snug text-white/90">
            {profile.photoPrivacy === "verified"
              ? "该用户设置：仅认证用户可看照片"
              : "该用户设置：仅登录用户可看照片"}
          </span>
        </div>
      )}
    </div>
  );
}
