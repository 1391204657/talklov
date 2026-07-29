"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";

type Platform = "ios" | "android" | "wechat" | null;

function detectPlatform(): Platform {
  if (typeof window === "undefined") return null;
  const ua = navigator.userAgent || "";
  // WeChat in-app browser (common in China) — must open in system browser first
  if (/MicroMessenger/i.test(ua)) return "wechat";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return null;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

const DISMISS_KEY = "talklov_install_guide_dismissed";

const copy = {
  zh: {
    iosTitle: "添加到主屏幕，像 App 一样用",
    iosSteps: [
      "点击当前右下角的「···」",
      "点击「分享」（有的机型显示为「共享」）",
      "选择「添加到主屏幕」并确认，即可在主屏幕找到 TalkLov 图标",
    ],
    androidTitle: "添加到主屏幕，像 App 一样用",
    androidSteps: [
      "点浏览器菜单「···」或「⋮」（位置因浏览器而异，多在右上角）",
      "找「添加到主屏幕 / 添加到桌面 / 安装应用 / 收藏到桌面」任一选项",
      "确认后，即可在主屏幕找到 TalkLov 图标",
    ],
    wechatTitle: "请先用浏览器打开，再添加到主屏幕",
    wechatSteps: [
      "点微信右上角「···」",
      "选择「在浏览器打开」（系统浏览器 / Chrome / 夸克等均可）",
      "在浏览器里再按提示「添加到主屏幕」，即可找到 TalkLov 图标",
    ],
    installBtn: "一键安装",
    dismiss: "知道了",
    later: "稍后再说",
  },
  en: {
    iosTitle: "Add to Home Screen — use it like an app",
    iosSteps: [
      "Tap the ··· button at the bottom-right",
      "Tap Share",
      "Choose “Add to Home Screen” — then find the TalkLov icon on your Home Screen",
    ],
    androidTitle: "Add to Home Screen — use it like an app",
    androidSteps: [
      "Tap ··· or ⋮ in your browser menu (usually top-right)",
      "Choose “Add to Home screen”, “Install app”, or similar",
      "Confirm — then find the TalkLov icon on your Home Screen",
    ],
    wechatTitle: "Open in a browser first, then add to Home Screen",
    wechatSteps: [
      "Tap ··· at the top-right in WeChat",
      "Choose “Open in browser”",
      "In the browser, add TalkLov to your Home Screen",
    ],
    installBtn: "Install",
    dismiss: "Got it",
    later: "Not now",
  },
} as const;

/** Mobile-only install guide for iOS Safari & Android Chrome (hidden when already installed). */
export default function InstallGuide() {
  const { locale } = useApp();
  const t = copy[locale === "en" ? "en" : "zh"];
  const [platform, setPlatform] = useState<Platform>(null);
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<{
    prompt: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;

    const p = detectPlatform();
    if (!p) return;

    setPlatform(p);
    // Slight delay so it doesn’t fight first paint / modals
    const timer = window.setTimeout(() => setVisible(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      const ev = e as Event & { prompt: () => Promise<void> };
      setDeferredPrompt({ prompt: () => ev.prompt() });
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function dismiss(persistSession = true) {
    setVisible(false);
    if (persistSession) sessionStorage.setItem(DISMISS_KEY, "1");
  }

  async function installNative() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    setDeferredPrompt(null);
    dismiss(true);
  }

  if (!visible || !platform) return null;

  const title =
    platform === "ios"
      ? t.iosTitle
      : platform === "wechat"
        ? t.wechatTitle
        : t.androidTitle;
  const steps =
    platform === "ios"
      ? t.iosSteps
      : platform === "wechat"
        ? t.wechatSteps
        : t.androidSteps;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden"
      role="dialog"
      aria-label={title}
    >
      <div className="mx-auto max-w-md rounded-2xl border border-black/8 bg-white/85 p-4 shadow-[0_-8px_32px_rgba(40,20,60,0.12)] backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.45)]">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 drop-shadow-[0_0_4px_rgba(251,191,36,0.9)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M9 18h6" />
              <path d="M10 21h4" />
              <path d="M12 3a6 6 0 0 0-4 10.5V15a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-1.5A6 6 0 0 0 12 3Z" />
              <path d="M12 9v3" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold leading-snug text-foreground">
              {title}
            </p>
            <ol className="mt-2 space-y-1.5 text-[13px] leading-snug text-muted">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-semibold text-foreground">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {platform === "android" && deferredPrompt ? (
            <button
              type="button"
              onClick={installNative}
              className="flex-1 rounded-full bg-[#1c1c1f] py-2.5 text-sm font-semibold text-white"
            >
              {t.installBtn}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => dismiss(true)}
              className="flex-1 rounded-full bg-[#1c1c1f] py-2.5 text-sm font-semibold text-white"
            >
              {t.dismiss}
            </button>
          )}
          <button
            type="button"
            onClick={() => dismiss(true)}
            className="rounded-full border border-line bg-white/80 px-4 py-2.5 text-sm font-semibold text-muted"
          >
            {t.later}
          </button>
        </div>
      </div>
    </div>
  );
}
