"use client";

import { profiles } from "@/lib/mockData";
import type { Profile } from "@/lib/types";
import ProfilePhoto from "@/components/ProfilePhoto";

function MiniCard({ profile }: { profile: Profile }) {
  const photo = profile.photos?.[0] || profile.photo;
  return (
    <div className="relative overflow-hidden rounded-xl bg-surface-2 shadow-sm">
      <div className="relative aspect-[3/4] w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt={profile.name}
          className="h-full w-full object-cover"
          draggable={false}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

        {profile.online && (
          <span className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-black/40 px-1.5 py-0.5 text-[7px] text-white backdrop-blur-sm">
            <span className="h-1 w-1 rounded-full bg-success" />
            在线
          </span>
        )}
        {profile.verified && (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-sky-500/90 px-1.5 py-0.5 text-[7px] font-medium text-white">
            已认证
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 p-1.5 text-white">
          <div className="flex items-baseline gap-1 truncate">
            <span className="truncate text-[10px] font-semibold leading-tight">
              {profile.name.split(" ")[0]}
            </span>
            <span className="shrink-0 text-[8px] text-white/85">{profile.age}</span>
            <span className="shrink-0 text-[8px]">
              {profile.country === "CN" ? "🇨🇳" : "🇺🇸"}
            </span>
          </div>
          <div className="mt-0.5 truncate text-[8px] text-white/85">
            {profile.nativeLang}
            <span className="mx-0.5 opacity-50">→</span>
            {profile.learningLang}
          </div>
          <div className="mt-1 flex flex-wrap gap-0.5">
            {profile.intents.slice(0, 2).map((i) => (
              <span
                key={i}
                className="rounded-full bg-white/20 px-1 py-px text-[7px] backdrop-blur-sm"
              >
                {i === "language" ? "语伴" : i === "friends" ? "交友" : "缘分"}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function withPhoto(base: Profile, photo: string, patch?: Partial<Profile>): Profile {
  return { ...base, ...patch, photo, photos: [photo] };
}

function buildShowcaseFeed(): Profile[] {
  const byId = (id: string) => profiles.find((p) => p.id === id)!;

  // Distinct faces / outfits / scenes for marketing preview (not shared mock avatars)
  return [
    withPhoto(byId("lin"), "/brand/disc-cn-1.png"), // bob + blazer · cafe
    withPhoto(byId("jack"), "/brand/disc-us-1.png", {
      name: "Jake",
      age: 28,
      city: "San Diego, CA",
    }), // curly hair · denim · beach
    withPhoto(byId("mei"), "/brand/disc-cn-2.png"), // wavy hair · yellow · park
    withPhoto(byId("ryan"), "/brand/disc-us-2.png", {
      name: "Marcus",
      age: 31,
      city: "Atlanta, GA",
      online: true,
      verified: true,
    }), // Black · olive hoodie · bookstore
    withPhoto(byId("shan"), "/brand/disc-cn-3.png"), // ponytail · burgundy · night city
    withPhoto(byId("jack"), "/brand/disc-us-3.png", {
      id: "diego-showcase",
      name: "Diego",
      age: 27,
      city: "Miami, FL",
      online: false,
      verified: true,
      intents: ["language", "romance"],
    }), // Latino · patterned shirt · rooftop sunset
  ];
}

/** Phone + tablet frames previewing live app UI. */
export function DeviceShowcase({
  phoneCaption,
  tabletCaption,
  variant = "both",
}: {
  phoneCaption: string;
  tabletCaption: string;
  variant?: "both" | "phone";
}) {
  const feed = buildShowcaseFeed();
  const leftCol = [feed[0], feed[2], feed[4]];
  const rightCol = [feed[1], feed[3], feed[5]];
  // Same hero face as phone grid (disc-cn-1), not the shared mock avatar set
  const featured = feed[0];

  const phone = (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-[240px] rounded-[2rem] border border-black/10 bg-[#1c1c1f] p-2 shadow-[0_30px_80px_rgba(120,80,140,0.28)] sm:w-[260px]">
        <div className="absolute left-1/2 top-3 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black/80" />
        <div className="overflow-hidden rounded-[1.55rem] bg-background">
          <div className="flex items-center justify-between px-3 pb-0.5 pt-7 text-[9px] text-muted">
            <span>9:41</span>
            <span>TalkLov</span>
          </div>
          {/* Fixed viewport — overflow clipped so list feels endless */}
          <div className="relative h-[430px] overflow-hidden px-2">
            <div className="mb-1.5 flex gap-1 overflow-hidden">
              {["全部", "中国", "美国", "在线"].map((f, i) => (
                <span
                  key={f}
                  className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[8px] ${
                    i === 0
                      ? "bg-accent/15 font-medium text-accent"
                      : "glass text-muted"
                  }`}
                >
                  {f}
                </span>
              ))}
            </div>

            {/* Staggered two columns — right column offset; bottom cards clipped */}
            <div className="grid grid-cols-2 items-start gap-1.5">
              <div className="flex flex-col gap-1.5">
                {leftCol.map((p) => (
                  <MiniCard key={p.id} profile={p} />
                ))}
              </div>
              <div className="mt-5 flex flex-col gap-1.5">
                {rightCol.map((p) => (
                  <MiniCard key={p.id} profile={p} />
                ))}
              </div>
            </div>

            {/* Soft fade at bottom — suggests more users below */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent" />
          </div>
          <div className="grid grid-cols-5 border-t border-line bg-surface/80 py-1.5 text-center text-[7px] text-muted">
            {["发现", "消息", "动态", "练遇", "我的"].map((l, i) => (
              <span key={l} className={i === 0 ? "text-accent" : ""}>
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>
      {phoneCaption ? <p className="text-sm text-muted">{phoneCaption}</p> : null}
    </div>
  );

  if (variant === "phone") return phone;

  return (
    <div className="flex flex-col items-center justify-center gap-10 lg:flex-row lg:items-end lg:gap-14">
      {phone}

      <div className="flex flex-col items-center gap-3">
        <div className="relative w-full max-w-[520px] rounded-[1.6rem] border border-black/10 bg-[#1c1c1f] p-2.5 shadow-[0_30px_80px_rgba(80,120,180,0.22)]">
          <div className="overflow-hidden rounded-[1.2rem] bg-background">
            <div className="flex items-center justify-between border-b border-line px-5 py-3 text-xs text-muted">
              <span>TalkLov</span>
              <span>iPad · Preview</span>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-[1.1fr_0.9fr]">
              <div className="pointer-events-none overflow-hidden rounded-2xl">
                <ProfilePhoto
                  profile={featured}
                  className="aspect-[4/5] w-full"
                  rounded="rounded-2xl"
                  showWatermark={false}
                  segments="bottom"
                />
              </div>
              <div className="flex flex-col justify-center gap-3 rounded-2xl border border-line bg-surface/70 p-4">
                <div>
                  <div className="text-xl font-bold">{featured.name}</div>
                  <div className="text-sm text-muted">
                    {featured.city} · {featured.age}
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-line bg-background/60 px-3 py-2.5 text-sm">
                  <div className="flex-1 text-center">
                    <div className="text-[10px] text-muted">母语</div>
                    <div className="font-semibold">普通话</div>
                  </div>
                  <span className="text-accent">⇄</span>
                  <div className="flex-1 text-center">
                    <div className="text-[10px] text-muted">在学</div>
                    <div className="font-semibold">English（中级）</div>
                  </div>
                </div>
                <p className="line-clamp-3 text-sm leading-relaxed text-muted">
                  {featured.bio}
                </p>
                <div className="rounded-xl bg-[#1c1c1f] py-3 text-center text-sm font-semibold text-white">
                  打招呼
                </div>
              </div>
            </div>
          </div>
        </div>
        {tabletCaption ? (
          <p className="text-sm text-muted">{tabletCaption}</p>
        ) : null}
      </div>
    </div>
  );
}
