import type { Metadata } from "next";
import Link from "next/link";
import GuideChrome from "@/components/marketing/GuideChrome";
import { buildPageMetadata, seoCopy } from "@/lib/seo";

const page = seoCopy.zh.guides;

export const metadata: Metadata = buildPageMetadata(page);

const guides = [
  seoCopy.zh.guideFindPartner,
  seoCopy.zh.guideSpokenEnglish,
  seoCopy.zh.guideLanguage,
  seoCopy.zh.guideFlashCheck,
];

export default function GuidesIndexPage() {
  return (
    <GuideChrome>
      <p className="text-sm text-muted">
        <Link href="/" className="hover:text-foreground">
          首页
        </Link>
        <span className="mx-1.5">/</span>
        <span>指南</span>
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">指南</h1>
      <p className="mt-3 text-base leading-relaxed text-muted">
        怎么找中英语伴、如何和美国人练口语，以及在 TalkLov 上开始聊天前需要知道的事。
      </p>
      <ul className="mt-8 space-y-3">
        {guides.map((guide) => (
          <li key={guide.path}>
            <Link
              href={guide.path}
              className="block rounded-2xl border border-line bg-surface/60 px-5 py-4 hover:bg-surface"
            >
              <span className="text-lg font-bold">{guide.title.replace(/ · TalkLov.*/, "")}</span>
              <span className="mt-1 block text-sm leading-relaxed text-muted">
                {guide.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </GuideChrome>
  );
}
