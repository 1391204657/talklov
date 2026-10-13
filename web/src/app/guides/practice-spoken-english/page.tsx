import type { Metadata } from "next";
import Link from "next/link";
import GuideChrome from "@/components/marketing/GuideChrome";
import { JsonLd, articleJsonLd } from "@/components/seo/JsonLd";
import { buildPageMetadata, seoCopy } from "@/lib/seo";

const page = seoCopy.zh.guideSpokenEnglish;

export const metadata: Metadata = buildPageMetadata(page);

export default function PracticeSpokenEnglishPage() {
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
        <span>练口语</span>
      </p>
      <article className="mt-4">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">和美国人练口语</h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          和美国母语者说话，练的是反应速度和真实用词，不是把课文背完。每次聊得短一点、具体一点，比一次聊很久更容易坚持。
        </p>

        <h2 className="mt-10 text-xl font-bold">一对一为什么有用</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">
          看美剧能熟悉声音，但不会有人等你回答。一对一聊天里，你必须把句子说完，对方也会用日常说法接话。美式英语里的省略、连读和口头禅，就是在这种来回里听到的。
        </p>

        <h2 className="mt-10 text-xl font-bold">一次聊天可以怎么安排</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-foreground/90">
          <li>先约 15 到 25 分钟。时间短，双方都更容易答应下一次。</li>
          <li>前几分钟用英语说今天做了什么。卡住时换成中文问一个词，再说回英语。</li>
          <li>中间留几分钟让对方用中文说，你来听或纠正。语言交换才容易长期继续。</li>
          <li>结束前约下次，并留一个下次要聊的小题目。</li>
        </ul>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">
          中国晚上常对应美国白天。看对方所在时区，选一段两边都醒着的时间，比临时发「在吗」更容易约上。
        </p>

        <h2 className="mt-10 text-xl font-bold">说错了就继续说</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">
          母语者通常听得懂不完美的句子。与其一句改很多次，不如先把意思说完，再请对方给一个更自然的说法。你可以这样问： “How would you say that?” 然后把那句记下来，下次用一次。
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-foreground/90">
          <li>每次只改一个点，例如时态，或某个你反复用错的词。</li>
          <li>语音消息适合练连读。打字适合把不确定的词写清楚。</li>
          <li>对方如果只聊天、不纠正，直接说你希望被纠正。很多人会照做。</li>
        </ul>

        <h2 className="mt-10 text-xl font-bold">话题不用很难</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-foreground/90">
          <li>今天的午饭、通勤、天气。这些句子以后每天都用得上。</li>
          <li>对方资料里的兴趣。你已经有一个可以提问的具体东西。</li>
          <li>两边不一样的日常，例如小费、课程、节假日。差异本身就是话题。</li>
        </ul>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">
          还没找到合适的人，可以先看
          <Link
            href="/guides/find-language-partner"
            className="mx-1 text-accent underline-offset-2 hover:underline"
          >
            怎么找中英语伴
          </Link>
          。
        </p>

        <h2 className="mt-10 text-xl font-bold">聊的时候守住边界</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-foreground/90">
          <li>不要应要求转账、代付或参与投资。</li>
          <li>刚认识就要求换到无法举报的私密渠道时，可以先留在原对话里。</li>
          <li>TalkLov 在一对一聊天前会做真人闪验。想了解它检查什么，看
            <Link
              href="/guides/flash-check"
              className="mx-1 text-accent underline-offset-2 hover:underline"
            >
              真人闪验与安全聊天
            </Link>
            。
          </li>
        </ul>

        <p className="mt-10 rounded-2xl border border-line bg-surface/60 px-4 py-4 text-sm leading-relaxed text-muted">
          可以先在发现页看谁的母语是英语、又在学中文。
          <Link href="/discover" className="ml-1 font-medium text-accent">
            打开发现
          </Link>
        </p>
      </article>
    </GuideChrome>
  );
}
