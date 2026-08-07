import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import Modals from "@/components/Modals";
import InstallGuide from "@/components/InstallGuide";
import ReferralCapture from "@/components/ReferralCapture";
import BanBanner from "@/components/BanBanner";
import { CallProvider } from "@/components/calls/CallProvider";
import InboxBadgeSync from "@/components/InboxBadgeSync";
import { SITE_NAME, SITE_URL, seoCopy } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: seoCopy.zh.defaultTitle,
    template: `%s · ${SITE_NAME}`,
  },
  description: seoCopy.zh.defaultDescription,
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME,
  },
  icons: {
    icon: [
      { url: "/brand/talklov-app-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/talklov-app-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/brand/talklov-app-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    alternateLocale: ["en_US"],
    url: SITE_URL,
    siteName: SITE_NAME,
    title: seoCopy.zh.defaultTitle,
    description: seoCopy.zh.defaultDescription,
    images: [
      {
        url: "/brand/og-default.png",
        width: 1200,
        height: 675,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: seoCopy.zh.defaultTitle,
    description: seoCopy.zh.defaultDescription,
    images: ["/brand/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f1f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full" data-theme="light">
      <body className="min-h-full bg-background text-foreground antialiased">
        <AppProvider>
          <CallProvider>
            <BanBanner />
            <InboxBadgeSync />
            {children}
            <Suspense fallback={null}>
              <ReferralCapture />
            </Suspense>
            <Modals />
            <InstallGuide />
          </CallProvider>
        </AppProvider>
      </body>
    </html>
  );
}
