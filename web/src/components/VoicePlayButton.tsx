"use client";

import { useState } from "react";
import type { Profile } from "@/lib/types";
import {
  playVoiceIntro,
  resolveVoiceIntro,
  stopVoiceIntro,
} from "@/lib/voiceIntro";

function PlayIcon({ playing }: { playing: boolean }) {
  if (playing) {
    return (
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden>
        <rect x="6" y="5" width="4" height="14" rx="1" />
        <rect x="14" y="5" width="4" height="14" rx="1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden>
      <path d="M8.2 5.4c-.7-.4-1.5.1-1.5.9v11.4c0 .8.8 1.3 1.5.9l9.2-5.7c.6-.4.6-1.4 0-1.8L8.2 5.4Z" />
    </svg>
  );
}

/** Compact white play control for Discover cards / profile hero (~75% of prior 36px). */
export default function VoicePlayButton({
  profile,
  className = "",
}: {
  profile: Profile;
  className?: string;
}) {
  const intro = resolveVoiceIntro(profile);
  const [playing, setPlaying] = useState(false);
  if (!intro) return null;

  const onPlay = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (playing) {
      stopVoiceIntro();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    await playVoiceIntro(intro, () => setPlaying(false));
  };

  return (
    <button
      type="button"
      aria-label={playing ? "暂停语音介绍" : "播放语音介绍"}
      onClick={onPlay}
      className={`z-10 flex h-[27px] w-[27px] items-center justify-center rounded-full bg-white text-black shadow-md transition active:scale-95 ${className}`}
    >
      <PlayIcon playing={playing} />
    </button>
  );
}
