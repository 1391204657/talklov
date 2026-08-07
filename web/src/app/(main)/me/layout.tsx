import type { Metadata } from "next";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...noIndexMetadata,
  title: { absolute: "我的 · TalkLov" },
};

export default function MeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
