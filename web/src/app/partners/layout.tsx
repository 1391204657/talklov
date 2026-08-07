import type { Metadata } from "next";
import { buildPageMetadata, seoCopy } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata(seoCopy.zh.partners);

export default function PartnersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
