"use client";

import Link from "next/link";
import { Profile } from "@/lib/types";
import ProfilePhoto from "./ProfilePhoto";

const intentLabel: Record<string, string> = {
  language: "语伴",
  friends: "交友",
  romance: "缘分",
};

const intentIcon: Record<string, React.ReactNode> = {
  language: (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M3 4.5h7.5A1.5 1.5 0 0 1 12 6v3a1.5 1.5 0 0 1-1.5 1.5H7L4.5 13v-2.5H3A1.5 1.5 0 0 1 1.5 9V6A1.5 1.5 0 0 1 3 4.5Z" strokeLinejoin="round" />
    </svg>
  ),
  friends: (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="6" cy="5.5" r="2" />
      <circle cx="11" cy="6.5" r="1.6" />
      <path d="M1.8 13c.8-2 2.4-3 4.2-3s3.4 1 4.2 3" strokeLinecap="round" />
      <path d="M10 10.2c1.2.1 2.3.8 3 2" strokeLinecap="round" />
    </svg>
  ),
  romance: (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path
        d="M8 13S2.5 9.2 2.5 5.8A2.8 2.8 0 0 1 8 4.2 2.8 2.8 0 0 1 13.5 5.8C13.5 9.2 8 13 8 13Z"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export default function ProfileCard({ profile }: { profile: Profile }) {
  return (
    <Link
      href={`/profile/${profile.id}`}
      className="group block animate-fadeUp"
    >
      <div className="relative">
        <ProfilePhoto
          profile={profile}
          className="aspect-[3/4] w-full"
          rounded="rounded-[1.35rem]"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 rounded-b-[1.35rem] bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

        {profile.online && (
          <span className="absolute left-2.5 top-5 flex items-center gap-1 rounded-full bg-black/35 px-2 py-1 text-[10px] text-white backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> 在线
          </span>
        )}
        {profile.verified && (
          <span className="absolute right-2.5 top-5 inline-flex items-center gap-0.5 rounded-full bg-sky-500/90 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-md">
            <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="8" cy="8" r="6" />
              <path d="m5.2 8.2 1.8 1.8 3.8-3.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            已认证
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 p-2.5 text-white">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-semibold leading-tight">
              {profile.name}
            </span>
            <span className="text-xs text-white/80">{profile.age}</span>
            <span className="text-xs">
              {profile.country === "CN" ? "🇨🇳" : "🇺🇸"}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-white/85">
            <span>{profile.nativeLang}</span>
            <span className="opacity-50">→</span>
            <span>{profile.learningLang}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {profile.intents.map((i) => (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] backdrop-blur-md"
              >
                <span className="opacity-90">{intentIcon[i]}</span>
                {intentLabel[i]}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
