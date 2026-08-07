import type { Metadata } from "next";
import { buildPageMetadata, seoCopy } from "@/lib/seo";
import { JsonLd, faqPageJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = buildPageMetadata(seoCopy.zh.faq);

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={faqPageJsonLd("zh")} />
      {children}
    </>
  );
}
