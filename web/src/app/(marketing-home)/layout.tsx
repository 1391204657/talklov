import type { Metadata } from "next";
import { buildPageMetadata, seoCopy } from "@/lib/seo";
import {
  JsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
  websiteJsonLd,
} from "@/components/seo/JsonLd";

export const metadata: Metadata = buildPageMetadata(seoCopy.zh.home);

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <JsonLd data={softwareApplicationJsonLd()} />
      {children}
    </>
  );
}
