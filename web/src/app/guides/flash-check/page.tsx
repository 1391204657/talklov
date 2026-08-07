import type { Metadata } from "next";
import Link from "next/link";
import GuideChrome from "@/components/marketing/GuideChrome";
import { JsonLd, articleJsonLd } from "@/components/seo/JsonLd";
import { buildPageMetadata, seoCopy } from "@/lib/seo";

const page = seoCopy.zh.guideFlashCheck;

export const metadata: Metadata = buildPageMetadata(page);

export default function FlashCheckGuidePage() {
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
        <Link href="/guides/language-exchange" className="hover:text-foreground">
          指南
        </Link>
        <span className="mx-1.5">/</span>
        <span>闪验</span>
      </p>
      <article className="mt-4">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          真人闪验与安全聊天
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          跨文化社交最怕遇到假资料。TalkLov
          用「闪验」在聊天前确认对方是真人，同时尽量少采集敏感信息。
        </p>

        <h2 className="mt-10 text-xl font-bold">闪验是什么？</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">
          闪验是对着手机或电脑摄像头做的一组短动作（例如把脸放进框内、保持不动）。系统会判断是否为活体本人，通过后你会获得「已认证」标识。全程不要求上传身份证等证件。
        </p>

        <h2 className="mt-10 text-xl font-bold">为什么聊天前要闪验？</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-foreground/90">
          <li>降低盗用他人照片建号的情况。</li>
          <li>让认真练语言、交朋友的人更容易互相信任。</li>
          <li>配合开场白需对方接受等机制，减少骚扰。</li>
        </ul>

        <h2 className="mt-10 text-xl font-bold">隐私方面你需要知道</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-foreground/90">
          <li>闪验过程用于验证，不会把验证自拍当作公开相册展示。</li>
          <li>你可以在「我的」里设置照片可见范围（所有人 / 仅登录 / 仅认证用户）。</li>
          <li>更完整的说明见
            <Link href="/privacy" className="mx-1 text-accent underline-offset-2 hover:underline">
              隐私政策
            </Link>
            。
          </li>
        </ul>

        <h2 className="mt-10 text-xl font-bold">安全聊天小提示</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-foreground/90">
          <li>不要应要求转账、投资、代付或扫描陌生收款码。</li>
          <li>警惕过早把聊天完全转移到无法举报的私密渠道。</li>
          <li>遇到骚扰或不适内容，可使用举报；严重情况请保留证据并联系平台。</li>
          <li>语言交换可以愉快，但请把金钱与个人敏感信息分开。</li>
        </ul>

        <h2 className="mt-10 text-xl font-bold">做不好闪验怎么办？</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">
          请在光线充足、正对镜头的环境下重试；关闭过度美颜滤镜。若服务暂时不可用，可能会提供安全自拍备用通道，由人工复核。仍失败时可稍后再试或查看
          <Link href="/faq" className="mx-1 text-accent underline-offset-2 hover:underline">
            常见问题
          </Link>
          。
        </p>

        <p className="mt-10 rounded-2xl border border-line bg-surface/60 px-4 py-4 text-sm leading-relaxed text-muted">
          想先找语伴？可以从发现页开始；准备聊天时再完成闪验。
          <Link href="/discover" className="ml-1 font-medium text-accent">
            打开发现
          </Link>
          <span className="mx-1">·</span>
          <Link
            href="/guides/language-exchange"
            className="font-medium text-accent"
          >
            语伴指南
          </Link>
        </p>
      </article>
    </GuideChrome>
  );
}
