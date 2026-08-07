import type { Metadata } from "next";
import Link from "next/link";
import GuideChrome from "@/components/marketing/GuideChrome";
import { JsonLd, articleJsonLd } from "@/components/seo/JsonLd";
import { buildPageMetadata, seoCopy } from "@/lib/seo";

const page = seoCopy.zh.guideLanguage;

export const metadata: Metadata = buildPageMetadata(page);

export default function LanguageExchangeGuidePage() {
  return (
    <GuideChrome>
      <JsonLd
        data={articleJsonLd({
          title: page.title,
          description: page.description,
          path: page.path,
        })}
      />
      <p className="text-sm text-muted">
        <Link href="/" className="hover:text-foreground">
          首页
        </Link>
        <span className="mx-1.5">/</span>
        <span>指南</span>
      </p>
      <article className="prose-talklov mt-4">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          如何找到中美语言搭子
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          TalkLov
          面向中国与美国用户：一边练习中英文，一边认识合拍的语伴或朋友。下面按真实使用路径说明，游客也可以先逛。
        </p>

        <h2 className="mt-10 text-xl font-bold">1. 先浏览，再决定要不要注册</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">
          打开「发现」可以看完整资料与照片（在对方隐私设置允许的范围内）。不必先注册也能感受合不合拍。想打招呼、收藏或聊天时，再登录即可。
        </p>
        <p className="mt-3">
          <Link
            href="/discover"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            去发现页看看 →
          </Link>
        </p>

        <h2 className="mt-10 text-xl font-bold">2. 用适合你所在地区的方式登录</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-foreground/90">
          <li>中国：优先邮箱验证码；也可用 Apple。手机短信通道开通后会自动出现。</li>
          <li>美国：Google / Apple，或邮箱验证码 / 密码。</li>
          <li>一号一账号：减少刷号与虚假身份，保障语伴质量。</li>
        </ul>

        <h2 className="mt-10 text-xl font-bold">3. 看什么字段更容易合拍</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-foreground/90">
          <li>母语与在学语言是否互补（例如母语中文、在学英语）。</li>
          <li>普通话 / 粤语等中文变体，方便找到口音合适的搭子。</li>
          <li>意图标签：练语言、交友、文化交换等，避免期待错位。</li>
          <li>简介与兴趣：比单看照片更能判断聊得来与否。</li>
        </ul>

        <h2 className="mt-10 text-xl font-bold">4. 聊天前完成真人闪验</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">
          进入一对一聊天前，TalkLov 会请你做「闪验」：对着镜头做几个小动作，确认是真人本人。不强制上传证件。这能明显降低盗图与骗子风险。
        </p>
        <p className="mt-3">
          <Link
            href="/guides/flash-check"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            了解闪验与安全提示 →
          </Link>
        </p>

        <h2 className="mt-10 text-xl font-bold">5. 开场更轻松的小建议</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-foreground/90">
          <li>提到对方简介里的具体兴趣，比「你好」更容易得到回复。</li>
          <li>用对方在学的语言写一两句，并允许纠错，气氛会轻松很多。</li>
          <li>涉及金钱、投资、私下导流到陌生 App 的请求请提高警惕。</li>
        </ul>

        <p className="mt-10 rounded-2xl border border-line bg-surface/60 px-4 py-4 text-sm leading-relaxed text-muted">
          准备好了？先去发现页逛逛，遇到想认识的人再注册登录。
          <Link href="/discover" className="ml-1 font-medium text-accent">
            打开发现
          </Link>
        </p>
      </article>
    </GuideChrome>
  );
}
