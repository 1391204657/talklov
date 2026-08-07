import type { Metadata } from "next";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...noIndexMetadata,
  title: { absolute: "诊断 · TalkLov" },
};

export default function DiagLayout({ children }: { children: React.ReactNode }) {
  return children;
}
