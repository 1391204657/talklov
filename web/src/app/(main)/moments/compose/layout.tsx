import type { Metadata } from "next";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...noIndexMetadata,
  title: { absolute: "发动态 · TalkLov" },
};

export default function ComposeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
