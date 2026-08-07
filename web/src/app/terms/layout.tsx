import type { Metadata } from "next";
import { buildPageMetadata, seoCopy } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata(seoCopy.zh.terms);

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
