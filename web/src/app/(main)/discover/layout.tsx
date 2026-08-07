import type { Metadata } from "next";
import { buildPageMetadata, seoCopy } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata(seoCopy.zh.discover);

export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
