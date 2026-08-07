import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";
import { faqItems } from "@/lib/marketingCopy";

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/brand/talklov-app-icon-512.png"),
    sameAs: [] as string[],
    description:
      "中美语言交换与交友平台。和母语者练中英文，认识另一个世界的人。",
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: ["zh-CN", "en"],
    potentialAction: {
      "@type": "ViewAction",
      target: absoluteUrl("/discover"),
    },
  };
}

export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "SocialNetworkingApplication",
    operatingSystem: "Web, iOS, Android",
    url: SITE_URL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "US–China language exchange and social PWA. Practice Mandarin & English with natives.",
  };
}

export function faqPageJsonLd(locale: "zh" | "en" = "zh") {
  const items = faqItems[locale];
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export function articleJsonLd(opts: {
  title: string;
  description: string;
  path: string;
  datePublished?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.description,
    url: absoluteUrl(opts.path),
    datePublished: opts.datePublished || "2026-08-07",
    dateModified: opts.datePublished || "2026-08-07",
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/brand/talklov-app-icon-512.png"),
      },
    },
    image: absoluteUrl("/brand/og-default.png"),
    inLanguage: "zh-CN",
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}
