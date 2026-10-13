import type { Metadata } from "next";
import Link from "next/link";
import GuideChrome from "@/components/marketing/GuideChrome";
import { JsonLd, articleJsonLd } from "@/components/seo/JsonLd";
import { buildPageMetadata, seoCopy } from "@/lib/seo";

const page = seoCopy.zh.guideFindPartner;

export const metadata: Metadata = buildPageMetadata(page);

export default function FindLanguagePartnerPage() {
  return (
    <GuideChrome>
      <JsonLd
        data={articleJsonLd({
          title: page.title,
          description: page.description,
          path: page.path,
          datePublished: "2026-10-13",
        })}
      />
      <p className="text-sm text-muted">
        <Link href="/" className="hover:text-foreground">
          首页
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/guides" className="hover:text-foreground">
          指南
        </Link>
        <span className="mx-1.5">/</span>
        <span>找语伴</span>
      </p>
      <article className="mt-4">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">怎么找中英语伴</h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          中英语伴是母语互补的练习对象：一方母语是中文、想练英语，另一方母语是英语、想练中文。找对人，比找更多人更重要。
        </p>

        <h2 className="mt-10 text-xl font-bold">先定一个具体目标</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">
          「想练英语」太宽。先写成一件能在几次聊天里完成的事，例如：把自我介绍说顺、能聊周末安排、能听懂对方的慢速口语。目标清楚，你才知道该找什么水平的人。
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-foreground/90">
          <li>想开口：找愿意慢说、并接受你用中英夹杂的人。</li>
          <li>想纠正：找愿意指出用词，而不是只闲聊的人。</li>
          <li>想交朋友：看兴趣和作息，语言只是开始的理由。</li>
        </ul>

        <h2 className="mt-10 text-xl font-bold">看这几项是否合拍</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-foreground/90">
          <li>母语和在学语言互补。两个都在学英语的人，很难互相当母语示范。</li>
          <li>水平差距不要太大。能接上话，比「对方非常厉害」更有用。</li>
          <li>时差。中国晚上经常对应美国上午，先看双方是否真的有一段共同的空闲。</li>
          <li>中文变体。练普通话或粤语，写在资料里，能少一次误会。</li>
          <li>意图。有人只想练语言，有人想交朋友。期待不一致时，聊天很容易停。</li>
        </ul>

        <h2 className="mt-10 text-xl font-bold">第一条消息写具体一点</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">
          「你好，可以一起练英语吗」很容易被略过。更好的开场会提到对方资料里的一件具体事，并给出你能聊的话题。
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-foreground/90">
          <li>用对方正在学的语言写一两句，同时允许对方纠正。</li>
          <li>提出一个小话题，例如城市、工作日的午饭、最近在看的剧。</li>
          <li>说明你希望怎么练：例如每次 20 分钟，前半段说英语、后半段说中文。</li>
        </ul>

        <h2 className="mt-10 text-xl font-bold">在 TalkLov 上可以怎么找</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">
          发现页可以先看资料和照片，不必马上注册。资料里有母语、在学语言、水平和兴趣。想打招呼时再登录；进入一对一聊天前需要完成真人闪验，用来确认对方是本人。
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">
          如果主要想练开口，可以接着看
          <Link
            href="/guides/practice-spoken-english"
            className="mx-1 text-accent underline-offset-2 hover:underline"
          >
            和美国人练口语
          </Link>
          。平台上的注册、浏览和闪验步骤写在
          <Link
            href="/guides/language-exchange"
            className="mx-1 text-accent underline-offset-2 hover:underline"
          >
            如何找到中美语言搭子
          </Link>
          。
        </p>

        <p className="mt-10 rounded-2xl border border-line bg-surface/60 px-4 py-4 text-sm leading-relaxed text-muted">
          先逛资料，遇到目标接近的人再打招呼。
          <Link href="/discover" className="ml-1 font-medium text-accent">
            打开发现
          </Link>
        </p>
      </article>
    </GuideChrome>
  );
}
