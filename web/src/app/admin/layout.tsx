import type { Metadata } from "next";
import type { ReactNode } from "react";
import { noIndexMetadata } from "@/lib/seo";
import AdminChrome from "./AdminChrome";

export const metadata: Metadata = {
  ...noIndexMetadata,
  title: { absolute: "Admin · TalkLov" },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminChrome>{children}</AdminChrome>;
}
