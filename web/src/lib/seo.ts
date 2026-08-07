import type { Metadata } from "next";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://talklov.com";

export const SITE_NAME = "TalkLov";

type SeoLocale = "zh" | "en";

export type PageSeo = {
  title: string;
  description: string;
  path: string;
};

/** Default + per-route SEO copy (Chinese primary for talklov.com). */
export const seoCopy = {
  zh: {
    defaultTitle: "TalkLov · 你的中美语言搭子与交友平台",
    defaultDescription:
      "TalkLov — 中美语言交换与自然交友。和母语者练中英文，认识另一个世界的人。游客可先浏览，聊天前真人闪验。",
    home: {
      title: "TalkLov · 中美语言搭子与交友",
      description:
        "和美国 / 中国的母语者一对一练中英文。内置翻译与破冰，先逛逛感受合拍，聊天前真人认证。",
      path: "/",
    },
    faq: {
      title: "常见问题 · TalkLov",
      description:
        "TalkLov 是什么、要不要注册、真人闪验、一号一账号、普通话与粤语、如何添加到主屏幕。",
      path: "/faq",
    },
    partners: {
      title: "推广合作 · TalkLov",
      description:
        "内容创作者与 KOL 推广 TalkLov，分享专属链接，用户开通 VIP / Boost 后按成交分佣。",
      path: "/partners",
    },
    terms: {
      title: "用户协议 · TalkLov",
      description: "TalkLov 用户协议：使用条款、行为规范与账号规则。",
      path: "/terms",
    },
    privacy: {
      title: "隐私政策 · TalkLov",
      description: "TalkLov 隐私政策：我们如何收集、使用与保护你的信息。",
      path: "/privacy",
    },
    discover: {
      title: "发现语伴 · TalkLov",
      description: "浏览中美用户资料与照片，找到合拍的语言搭子。游客也可先逛。",
      path: "/discover",
    },
    guideLanguage: {
      title: "如何找到中美语言搭子 · TalkLov 指南",
      description:
        "从浏览发现页、注册登录到真人闪验：一步步在 TalkLov 找到合适的中英文语伴与朋友。",
      path: "/guides/language-exchange",
    },
    guideFlashCheck: {
      title: "真人闪验与安全聊天 · TalkLov 指南",
      description:
        "了解 TalkLov 闪验是什么、为什么聊天前要认证、如何保护隐私，以及安全交友小提示。",
      path: "/guides/flash-check",
    },
  },
  en: {
    defaultTitle: "TalkLov · US–China language partners & social",
    defaultDescription:
      "TalkLov — language exchange and natural connections between the US and China. Practice Mandarin & English with natives. Browse as a guest; Flash Check before chat.",
    home: {
      title: "TalkLov · Language partners across the US & China",
      description:
        "One-to-one Mandarin & English with native speakers. Translation, icebreakers, browse first — verify before you chat.",
      path: "/",
    },
    faq: {
      title: "FAQ · TalkLov",
      description:
        "What TalkLov is, browsing without an account, Flash Check, one phone one account, Mandarin & Cantonese, Add to Home Screen.",
      path: "/faq",
    },
    partners: {
      title: "Partner program · TalkLov",
      description:
        "Creators and KOLs: share your TalkLov link and earn commission when users subscribe to VIP / Boost.",
      path: "/partners",
    },
    terms: {
      title: "Terms of Use · TalkLov",
      description: "TalkLov Terms of Use: rules for using the platform and your account.",
      path: "/terms",
    },
    privacy: {
      title: "Privacy Policy · TalkLov",
      description:
        "TalkLov Privacy Policy: how we collect, use, and protect your information.",
      path: "/privacy",
    },
    discover: {
      title: "Discover · TalkLov",
      description:
        "Browse US–China profiles and photos. Find a language partner — guests welcome.",
      path: "/discover",
    },
    guideLanguage: {
      title: "How to find a US–China language partner · TalkLov",
      description:
        "Browse Discover, sign up, then Flash Check — a practical guide to finding Mandarin/English partners on TalkLov.",
      path: "/guides/language-exchange",
    },
    guideFlashCheck: {
      title: "Flash Check & safer chat · TalkLov guide",
      description:
        "What Flash Check is, why TalkLov asks before chat, privacy tips, and safer ways to meet language partners.",
      path: "/guides/flash-check",
    },
  },
} as const;

export function absoluteUrl(path = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${p === "/" ? "" : p}` || SITE_URL;
}

export function buildPageMetadata(
  page: PageSeo,
  opts?: { locale?: SeoLocale; noIndex?: boolean }
): Metadata {
  const locale = opts?.locale ?? "zh";
  const url = absoluteUrl(page.path);
  const ogLocale = locale === "en" ? "en_US" : "zh_CN";

  return {
    title: {
      absolute: page.title,
    },
    description: page.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      locale: ogLocale,
      url,
      siteName: SITE_NAME,
      title: page.title,
      description: page.description,
      images: [
        {
          url: "/brand/og-default.png",
          width: 1200,
          height: 675,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: ["/brand/og-default.png"],
    },
    robots: opts?.noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true },
  };
}

export const noIndexMetadata: Metadata = {
  title: {
    absolute: "TalkLov",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};
