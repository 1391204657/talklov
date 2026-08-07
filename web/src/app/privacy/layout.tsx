import type { Metadata } from "next";
import { buildPageMetadata, seoCopy } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata(seoCopy.zh.privacy);

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
