import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import Modals from "@/components/Modals";

export const metadata: Metadata = {
  title: "TalkLov · 你的中美语言搭子与交友平台",
  description:
    "TalkLov — 中美语言交换与自然交友。和母语者练中英文，认识另一个世界的人。",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TalkLov",
  },
  icons: {
    icon: "/brand/talklov-logo.png",
    apple: "/brand/talklov-logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f1f6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full" data-theme="light">
      <body className="min-h-full bg-background text-foreground antialiased">
        <AppProvider>
          {children}
          <Modals />
        </AppProvider>
      </body>
    </html>
  );
}
