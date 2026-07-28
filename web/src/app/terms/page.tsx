"use client";

import Link from "next/link";
import {
  MarketingFooter,
  MarketingNav,
} from "@/components/marketing/MarketingChrome";
import { marketingCopy, type MarketingLocale } from "@/lib/marketingCopy";
import { useApp } from "@/lib/store";

export default function TermsPage() {
  const { locale } = useApp();
  const lang = (locale === "en" ? "en" : "zh") as MarketingLocale;
  const t = marketingCopy[lang];

  const sections =
    lang === "zh"
      ? [
          {
            h: "1. 服务说明",
            p: "TalkLov（talklov.com）提供中美用户之间的语言交换与社交服务。你可以通过浏览、打招呼、聊天等方式使用本平台。部分功能需注册或真人认证后可用。",
          },
          {
            h: "2. 账号与手机号",
            p: "注册以手机验证码为主。一个手机号仅可绑定一个账号。你有责任妥善保管验证码与设备，不得出借、售卖账号或用于违法用途。",
          },
          {
            h: "3. 用户行为",
            p: "禁止骚扰、欺诈、色情低俗、仇恨言论、冒充他人、传播恶意软件等行为。我们可能限制、暂停或终止违规账号，并配合合法合规要求。",
          },
          {
            h: "4. 内容与隐私",
            p: "你上传的照片与文字应拥有相应权利。我们按隐私政策处理个人信息；真人认证自拍仅用于核验，不会作为公开资料展示。",
          },
          {
            h: "5. 免责声明",
            p: "用户之间的交流由当事人自行判断与负责。TalkLov 尽力提供安全工具，但不保证所有用户行为。涉及金钱转账、线下见面请格外谨慎。",
          },
          {
            h: "6. 条款更新",
            p: "我们可能更新本条款。重大变更将在网站或应用内提示。继续使用即视为接受更新后的条款。",
          },
          {
            h: "7. 联系我们",
            p: "如有疑问，请通过 talklov.com 站点公示的联系方式与我们沟通。（演示站可稍后补全正式邮箱）",
          },
        ]
      : [
          {
            h: "1. Service",
            p: "TalkLov (talklov.com) provides language exchange and social features for users interested in US–China connections. Some features require registration or selfie verification.",
          },
          {
            h: "2. Accounts & phone numbers",
            p: "Signup is phone-OTP first. One phone number may bind only one account. Keep your codes and devices secure; do not sell or misuse accounts.",
          },
          {
            h: "3. Conduct",
            p: "Harassment, fraud, explicit content, hate speech, impersonation, and malware are prohibited. We may limit or terminate accounts and comply with lawful requests.",
          },
          {
            h: "4. Content & privacy",
            p: "You must have rights to content you upload. Personal data is handled per our privacy practices. Verification selfies are used for checks only and are not shown as public profile media.",
          },
          {
            h: "5. Disclaimer",
            p: "Conversations between users are their own responsibility. TalkLov provides safety tools but cannot guarantee all behavior. Be careful with money transfers and in-person meetings.",
          },
          {
            h: "6. Updates",
            p: "We may update these Terms. Material changes will be noted on the site or in-app. Continued use means you accept the updated Terms.",
          },
          {
            h: "7. Contact",
            p: "Questions: use the contact channel published on talklov.com (demo site — formal email TBD).",
          },
        ];

  return (
    <div className="marketing-site min-h-dvh">
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← {t.navHome}
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {t.navTerms}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {lang === "zh" ? "更新日期：2026-07-27（演示草案）" : "Updated: 2026-07-27 (draft)"}
        </p>
        <div className="mt-8 space-y-6">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-lg font-bold">{s.h}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.p}</p>
            </section>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
