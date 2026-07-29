"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";

type Platform = "ios" | "android" | null;

function detectPlatform(): Platform {
  if (typeof window === "undefined") return null;
  const ua = navigator.userAgent || "";
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
      "点 Safari 底栏的「分享」按钮（有的机型显示为「共享」）",
      "上滑菜单，找到并点「添加到主屏幕」",
      "再点右上角「添加」即可",
    ],
    androidTitle: "添加到主屏幕，像 App 一样用",
    androidSteps: [
      "点浏览器右上角「⋮」菜单",
      "选择「添加到主屏幕」或「安装应用」",
      "确认后，主屏幕会出现 TalkLov 图标",
    ],
    installBtn: "一键安装",
    dismiss: "知道了",
    later: "稍后再说",
  },
  en: {
    iosTitle: "Add to Home Screen — use it like an app",
    iosSteps: [
      "Tap the Share button in Safari’s toolbar (square with an arrow)",
      "Scroll and tap “Add to Home Screen”",
      "Tap “Add” in the top-right corner",
    ],
    androidTitle: "Add to Home Screen — use it like an app",
    androidSteps: [
      "Tap the ⋮ menu in your browser",
      "Choose “Add to Home screen” or “Install app”",
      "Confirm — TalkLov will appear on your home screen",
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

  const title = platform === "ios" ? t.iosTitle : t.androidTitle;
  const steps = platform === "ios" ? t.iosSteps : t.androidSteps;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden"
      role="dialog"
      aria-label={title}
    >
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-background/95 p-4 shadow-[0_-8px_40px_rgba(40,20,60,0.18)] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1c1c1f] text-white">
            {platform === "ios" ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v12" strokeLinecap="round" />
                <path d="M8 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" strokeLinecap="round" />
              </svg>
            ) : (
              <span className="text-lg font-bold leading-none">⋮</span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold leading-snug">{title}</p>
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
            className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-muted"
          >
            {t.later}
          </button>
        </div>
      </div>
    </div>
  );
}
