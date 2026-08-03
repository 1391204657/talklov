"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/store";
import {
  CompletenessBar,
  ProfileAboutFields,
  ProfileBasicsFields,
  ProfilePhotoFields,
} from "@/components/ProfileForm";
import type { MyProfile } from "@/lib/profile";

export default function EditProfile() {
  const { tier, myProfile, updateMyProfile, openRegister, locale } = useApp();
  const en = locale === "en";
  const router = useRouter();
  const [draft, setDraft] = useState<MyProfile>({ ...myProfile });
  const [saved, setSaved] = useState(false);

  if (tier === "guest") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-muted">
          {en ? "Sign in to edit your profile" : "登录后才能编辑资料"}
        </p>
        <button
          onClick={() => openRegister(en ? "edit profile" : "编辑资料")}
          className="btn-grad rounded-xl px-5 py-2.5 text-sm font-semibold"
        >
          {en ? "Sign up / Log in" : "注册 / 登录"}
        </button>
      </main>
    );
  }

  const patch = (p: Partial<MyProfile>) =>
    setDraft((d) => ({ ...d, ...p }));

  const save = () => {
    updateMyProfile({ ...draft, basicsLocked: true });
    setSaved(true);
    setTimeout(() => router.push("/me"), 600);
  };

  return (
    <main className="pb-10">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-background/90 px-4 py-3 backdrop-blur">
        <Link href="/me" className="text-xl">
          ←
        </Link>
        <h1 className="text-lg font-bold">
          {en ? "Edit profile" : "编辑资料"}
        </h1>
      </header>

      <div className="space-y-6 p-4">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <CompletenessBar
            profile={draft}
            verified={tier === "verified"}
          />
        </div>

        <section>
          <h2 className="mb-3 font-semibold">
            {en ? "Basics" : "基本信息"}
          </h2>
          <ProfileBasicsFields
            value={draft}
            onChange={patch}
            locked={myProfile.basicsLocked || Boolean(myProfile.age)}
          />
        </section>

        <section>
          <h2 className="mb-3 font-semibold">
            {en ? "About you" : "关于你"}
          </h2>
          <ProfileAboutFields value={draft} onChange={patch} />
        </section>

        <section>
          <h2 className="mb-3 font-semibold">
            {en ? "Photos (up to 3)" : "照片（最多 3 张）"}
          </h2>
          <ProfilePhotoFields value={draft} onChange={patch} />
        </section>

        <button
          onClick={save}
          disabled={!draft.name.trim() || draft.photos.length < 1}
          className="btn-grad w-full rounded-2xl py-3.5 font-semibold disabled:opacity-40"
        >
          {saved
            ? en
              ? "Saved ✓"
              : "已保存 ✓"
            : en
              ? "Save profile"
              : "保存资料"}
        </button>
      </div>
    </main>
  );
}
