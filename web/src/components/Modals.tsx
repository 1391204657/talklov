"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { defaultMyProfile, type MyProfile } from "@/lib/profile";
import {
  CompletenessBar,
  ProfileAboutFields,
  ProfileBasicsFields,
  ProfilePhotoFields,
} from "@/components/ProfileForm";
import {
  DEMO_OTP,
  type DialCode,
  dialMeta,
  maskE164,
} from "@/lib/phone";
import { allowDemoOtp } from "@/lib/authHelpers";
import { tApp } from "@/lib/appCopy";
import {
  privacySections,
  termsSections,
  type LegalSection,
} from "@/lib/legalCopy";
import type { MarketingLocale } from "@/lib/marketingCopy";
import {
  flashCopy,
  localizeVerifyError,
} from "@/lib/flashCheck";
import { emailsMatch } from "@/lib/rememberedAuth";

const OTP_LEN = 6;

/** Six empty boxes for email/SMS OTP entry (supports paste). */
function OtpBoxes({
  value,
  onChange,
  disabled,
  onComplete,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  onComplete?: (code: string) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: OTP_LEN }, (_, i) => value[i] ?? "");

  const focusAt = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(OTP_LEN - 1, i))];
    el?.focus();
    el?.select();
  };

  const setDigits = (next: string) => {
    const clean = next.replace(/\D/g, "").slice(0, OTP_LEN);
    onChange(clean);
    if (clean.length >= OTP_LEN) onComplete?.(clean);
  };

  return (
    <div className="flex justify-center gap-2" role="group" aria-label="OTP">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1}`}
          maxLength={1}
          disabled={disabled}
          value={d}
          placeholder=""
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "");
            if (!raw) {
              const arr = digits.slice();
              arr[i] = "";
              setDigits(arr.join(""));
              return;
            }
            // Paste or multi-digit into one box
            if (raw.length > 1) {
              const merged = (value.slice(0, i) + raw).replace(/\D/g, "").slice(0, OTP_LEN);
              setDigits(merged);
              focusAt(Math.min(merged.length, OTP_LEN - 1));
              return;
            }
            const arr = digits.slice();
            arr[i] = raw;
            const merged = arr.join("").replace(/\D/g, "").slice(0, OTP_LEN);
            setDigits(merged);
            if (i < OTP_LEN - 1) focusAt(i + 1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              if (digits[i]) {
                const arr = digits.slice();
                arr[i] = "";
                setDigits(arr.join(""));
              } else if (i > 0) {
                focusAt(i - 1);
                const arr = digits.slice();
                arr[i - 1] = "";
                setDigits(arr.join(""));
              }
              e.preventDefault();
            } else if (e.key === "ArrowLeft" && i > 0) {
              focusAt(i - 1);
              e.preventDefault();
            } else if (e.key === "ArrowRight" && i < OTP_LEN - 1) {
              focusAt(i + 1);
              e.preventDefault();
            } else if (e.key === "Enter" && value.length >= OTP_LEN) {
              onComplete?.(value);
            }
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
            if (!pasted) return;
            e.preventDefault();
            setDigits(pasted);
            focusAt(Math.min(pasted.length, OTP_LEN) - 1);
          }}
          className="h-12 w-10 rounded-xl border-2 border-line bg-white text-center text-lg font-semibold tabular-nums text-foreground shadow-sm outline-none placeholder:text-transparent focus:border-accent disabled:opacity-40 sm:h-14 sm:w-11"
        />
      ))}
    </div>
  );
}

function Sheet({
  children,
  footer,
  onClose,
  solid = false,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  solid?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`animate-modalIn relative flex max-h-[min(96vh,820px)] w-full max-w-[420px] flex-col overflow-hidden rounded-3xl border border-line shadow-[0_24px_80px_rgba(0,0,0,0.28)] ${
          solid ? "bg-white" : "bg-surface"
        }`}
        style={solid ? { backgroundColor: "#ffffff" } : undefined}
      >
        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${
            solid ? "px-0 pb-0 pt-0" : "px-5 pb-5 pt-6"
          }`}
        >
          {children}
        </div>
        {footer ? (
          <div
            className={`shrink-0 border-t border-line px-5 pt-3 ${
              solid ? "bg-white" : "bg-surface"
            }`}
            style={{
              paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LegalInline({
  title,
  sections,
  updated,
  onBack,
}: {
  title: string;
  sections: LegalSection[];
  updated: string;
  onBack: () => void;
}) {
  return (
    <div className="bg-white text-[#2a2433]">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-black/8 bg-white px-5 py-3.5">
        <h2 className="min-w-0 truncate text-lg font-bold">{title}</h2>
        <button
          type="button"
          onClick={onBack}
          aria-label="Close"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-2xl leading-none text-[#8a8196] transition hover:bg-black/5 hover:text-[#2a2433]"
        >
          ×
        </button>
      </div>
      <div className="px-5 pb-8 pt-4">
        <p className="text-xs text-[#8a8196]">{updated}</p>
        <div className="mt-5 space-y-5">
          {sections.map((s) => (
            <section key={s.h}>
              <h3 className="text-sm font-bold">{s.h}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#5c5568]">
                {s.p}
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function RegisterModal() {
  const {
    registerOpen,
    registerStartStep,
    closeModals,
    completeRegister,
    pendingAction,
    myProfile,
    openVerify,
    sendPhoneOtp,
    verifyPhoneOtp,
    signInWithOAuth,
    sendEmailOtp,
    verifyEmailOtp,
    emailAuth,
    canQuickResume,
    resumeEmail,
    lastAuthEmail,
    resumeSession,
    setLocale,
    setRegion,
    locale,
    region,
    userId,
  } = useApp();
  const router = useRouter();
  const copy = tApp(locale);
  const [step, setStep] = useState(0); // 0 methods, 1 otp, 2 basics, 3 about, 4 photos
  const [authChannel, setAuthChannel] = useState<"phone" | "email">("phone");
  const [draft, setDraft] = useState<MyProfile>({ ...defaultMyProfile });
  const [dial, setDial] = useState<DialCode>("+1");
  const [national, setNational] = useState("");
  const [e164, setE164] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailAuthMode, setEmailAuthMode] = useState<"otp" | "password">("otp");
  const [otp, setOtp] = useState("");
  const [isNewPhone, setIsNewPhone] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authErr, setAuthErr] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [agreedLegal, setAgreedLegal] = useState(false);
  const [legalView, setLegalView] = useState<"terms" | "privacy" | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const authRegion: "CN" | "US" = region === "CN" ? "CN" : "US";

  useEffect(() => {
    if (!registerOpen) {
      setStep(0);
      setNational("");
      setPassword("");
      setEmailAuthMode("otp");
      setOtp("");
      setAuthErr(null);
      setAgreedLegal(false);
      setLegalView(null);
      setShowEmailForm(false);
      setDraft({
        ...defaultMyProfile,
        ...myProfile,
        phoneE164: myProfile.phoneE164 || "",
      });
      return;
    }
    if (registerStartStep >= 2) {
      setStep(registerStartStep);
      setDraft({
        ...defaultMyProfile,
        ...myProfile,
        phoneE164: myProfile.phoneE164 || "",
      });
      return;
    }
    // Prefill last email; user can edit to another address.
    setEmail(lastAuthEmail || resumeEmail || "");
    // SMS pending provider setup — email is the reliable OTP path for both regions.
    setShowEmailForm(true);
    setDial(region === "CN" ? "+86" : "+1");
  }, [registerOpen, registerStartStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // OAuth can open the sheet before myProfile state flushes — refill empty draft fields.
  useEffect(() => {
    if (!registerOpen || step < 2) return;
    setDraft((d) => {
      const hasDraftBasics =
        !!(d.name || "").trim() && d.age != null && d.age >= 18;
      if (hasDraftBasics) return d;
      const hasProfileBasics =
        !!(myProfile.name || "").trim() &&
        myProfile.age != null &&
        myProfile.age >= 18;
      if (!hasProfileBasics && !(myProfile.photos?.length > 0)) return d;
      return {
        ...defaultMyProfile,
        ...myProfile,
        ...d,
        name: (d.name || "").trim() || myProfile.name || "",
        age: d.age ?? myProfile.age,
        photos: d.photos?.length ? d.photos : myProfile.photos || [],
        interests: d.interests?.length ? d.interests : myProfile.interests || [],
        phoneE164: d.phoneE164 || myProfile.phoneE164 || "",
      };
    });
  }, [registerOpen, step, myProfile]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!registerOpen) return null;

  const patch = (p: Partial<MyProfile>) =>
    setDraft((d) => ({ ...d, ...p }));

  const switchAuthRegion = (r: "CN" | "US") => {
    setRegion(r === "CN" ? "CN" : "global");
    setLocale(r === "CN" ? "zh" : "en");
    setDial(r === "CN" ? "+86" : "+1");
    // Email OTP until phone SMS provider is live.
    setShowEmailForm(true);
    setAuthErr(null);
    if (!draft.basicsLocked) {
      patch({
        country: r === "CN" ? "CN" : "US",
        nativeLang: r === "CN" ? "中文" : "English",
        learningLang: r === "CN" ? "English" : "中文",
        chineseVariants: r === "CN" ? ["mandarin"] : [],
      });
    }
  };

  const requireLegal = () => {
    if (!agreedLegal) {
      setAuthErr(copy.agreeRequired);
      return false;
    }
    return true;
  };

  const onOAuth = async (provider: "google" | "apple") => {
    if (!requireLegal()) return;
    setAuthErr(null);
    setAuthBusy(true);
    const res = await signInWithOAuth(provider);
    setAuthBusy(false);
    if (!res.ok) setAuthErr(res.error ?? "OAuth failed");
  };

  const sendCode = async () => {
    if (!requireLegal()) return;
    setAuthErr(null);
    setAuthBusy(true);
    const res = await sendPhoneOtp(dial, national);
    setAuthBusy(false);
    if (!res.ok) {
      setAuthErr(res.error ?? "发送失败");
      return;
    }
    setAuthChannel("phone");
    setE164(res.e164 ?? "");
    setIsNewPhone(res.isNew !== false);
    setStep(1);
    setCooldown(60);
    setOtp("");
  };

  const sendEmailCode = async () => {
    if (!requireLegal()) return;
    setAuthErr(null);
    setAuthBusy(true);
    const res = await sendEmailOtp(email);
    setAuthBusy(false);
    if (!res.ok) {
      setAuthErr(res.error ?? "发送失败");
      return;
    }
    setAuthChannel("email");
    setStep(1);
    setCooldown(60);
    setOtp("");
  };

  const signInWithPassword = async () => {
    if (!requireLegal()) return;
    setAuthErr(null);
    setAuthBusy(true);
    const res = await emailAuth("signin", email, password);
    setAuthBusy(false);
    if (!res.ok) {
      setAuthErr(res.error ?? (locale === "en" ? "Sign-in failed" : "登录失败"));
      return;
    }
    if (!draft.basicsLocked) {
      setDraft((d) => ({
        ...d,
        country: authRegion === "CN" ? "CN" : d.country || "US",
        nativeLang: authRegion === "CN" ? "中文" : d.nativeLang || "English",
        learningLang: authRegion === "CN" ? "English" : d.learningLang || "中文",
      }));
    }
    if (res.needProfile) {
      setStep(2);
    } else {
      closeModals();
    }
  };

  const onQuickResume = async () => {
    if (!requireLegal()) return;
    setAuthErr(null);
    setAuthBusy(true);
    const res = await resumeSession();
    setAuthBusy(false);
    if (!res.ok) {
      setAuthErr(
        res.error ??
          (locale === "en"
            ? "Could not resume — use email code"
            : "无法一键登录，请用验证码")
      );
      return;
    }
    if (res.needProfile) {
      setStep(2);
    } else {
      closeModals();
    }
  };

  const canResumeThisEmail =
    canQuickResume &&
    emailsMatch(email, resumeEmail || lastAuthEmail);

  const emailAuthFields = (
    <div className="space-y-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={copy.emailPlaceholder}
        autoComplete="email"
        onKeyDown={(e) => {
          if (e.key !== "Enter" || !email.trim()) return;
          if (canResumeThisEmail) void onQuickResume();
          else if (emailAuthMode === "password" && password)
            void signInWithPassword();
          else if (emailAuthMode === "otp") void sendEmailCode();
        }}
        className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 outline-none focus:border-accent"
      />
      {canResumeThisEmail ? (
        <>
          <p className="text-center text-[11px] text-muted">
            {copy.quickResumeHint}
          </p>
          <button
            type="button"
            disabled={authBusy || !agreedLegal}
            onClick={() => void onQuickResume()}
            className="btn-grad w-full rounded-xl py-3.5 font-semibold disabled:opacity-40"
          >
            {authBusy ? copy.signingIn : copy.quickResume}
          </button>
          <button
            type="button"
            onClick={() => {
              setEmail("");
              setAuthErr(null);
            }}
            className="w-full py-1 text-center text-sm text-muted"
          >
            {copy.useOtherEmail}
          </button>
        </>
      ) : emailAuthMode === "password" ? (
        <>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={copy.passwordPlaceholder}
            autoComplete="current-password"
            onKeyDown={(e) =>
              e.key === "Enter" &&
              email.trim() &&
              password &&
              void signInWithPassword()
            }
            className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 outline-none focus:border-accent"
          />
          <button
            type="button"
            disabled={authBusy || !email.trim() || !password || !agreedLegal}
            onClick={() => void signInWithPassword()}
            className="btn-grad w-full rounded-xl py-3.5 font-semibold disabled:opacity-40"
          >
            {authBusy ? copy.signingIn : copy.passwordSignIn}
          </button>
          <button
            type="button"
            onClick={() => {
              setEmailAuthMode("otp");
              setPassword("");
              setAuthErr(null);
            }}
            className="w-full py-1 text-center text-sm text-muted"
          >
            {copy.useEmailCode}
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            disabled={authBusy || !email.trim() || !agreedLegal}
            onClick={() => void sendEmailCode()}
            className="w-full rounded-xl bg-[#1c1c1f] py-3.5 font-semibold text-white disabled:opacity-40"
          >
            {authBusy ? copy.sending : copy.getEmailCode}
          </button>
          <button
            type="button"
            onClick={() => {
              setEmailAuthMode("password");
              setAuthErr(null);
            }}
            className="w-full py-1 text-center text-sm text-muted"
          >
            {copy.usePasswordLogin}
          </button>
        </>
      )}
    </div>
  );

  const verifyCode = async (codeOverride?: string) => {
    const code = (codeOverride ?? otp).replace(/\D/g, "");
    setAuthErr(null);
    setAuthBusy(true);
    const res =
      authChannel === "email"
        ? await verifyEmailOtp(email, code)
        : await verifyPhoneOtp(e164, code);
    setAuthBusy(false);
    if (!res.ok) {
      setAuthErr(res.error ?? "验证失败");
      return;
    }
    if (authChannel === "phone") {
      const meta = dialMeta(dial);
      setDraft((d) => ({
        ...d,
        phoneE164: e164,
        country: d.basicsLocked
          ? d.country
          : meta.country === "OTHER"
            ? d.country
            : meta.country,
        nativeLang: d.basicsLocked
          ? d.nativeLang
          : meta.locale === "zh"
            ? "中文"
            : "English",
        learningLang: d.basicsLocked
          ? d.learningLang
          : meta.locale === "zh"
            ? "English"
            : "中文",
        chineseVariants: d.basicsLocked
          ? d.chineseVariants
          : meta.locale === "zh"
            ? d.chineseVariants.length
              ? d.chineseVariants
              : ["mandarin"]
            : [],
      }));
    } else if (!draft.basicsLocked) {
      setDraft((d) => ({
        ...d,
        country: authRegion === "CN" ? "CN" : d.country || "US",
        nativeLang: authRegion === "CN" ? "中文" : d.nativeLang || "English",
        learningLang: authRegion === "CN" ? "English" : d.learningLang || "中文",
      }));
    }
    if (res.needProfile) {
      setStep(2);
    } else {
      closeModals();
    }
  };

  const finish = (goVerify: boolean, previewHome = false) => {
    completeRegister({
      ...draft,
      phoneE164: e164 || draft.phoneE164,
      basicsLocked: true,
    });
    if (goVerify) {
      openVerify(
        locale === "en" ? "showing a verified badge" : "展示已验证标签"
      );
      return;
    }
    if (previewHome) {
      const id = userId || "me";
      router.push(`/profile/${id}`);
    }
  };

  const canBasics =
    draft.name.trim().length > 0 &&
    draft.age !== null &&
    draft.age >= 18 &&
    draft.age <= 99 &&
    draft.intents.length > 0;

  const legalLang = (locale === "en" ? "en" : "zh") as MarketingLocale;

  const registerFooter =
    !legalView && step === 2 ? (
      <button
        disabled={!canBasics}
        onClick={() => setStep(3)}
        className="btn-grad w-full rounded-xl py-3 font-semibold disabled:opacity-40"
      >
        {locale === "en" ? "Next →" : "下一步 →"}
      </button>
    ) : !legalView && step === 3 ? (
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="flex-1 rounded-xl border border-line py-3 text-sm"
          >
            {locale === "en" ? "Back" : "上一步"}
          </button>
          <button
            type="button"
            onClick={() => setStep(4)}
            className="btn-grad flex-[2] rounded-xl py-3 font-semibold"
          >
            {locale === "en" ? "Add photos →" : "去添加照片 →"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => finish(false, true)}
          className="w-full rounded-xl border border-line py-2.5 text-sm font-medium"
        >
          {locale === "en"
            ? "Finish & preview profile"
            : "完成并预览我的主页"}
        </button>
        <button
          type="button"
          onClick={() => finish(false, false)}
          className="w-full py-1 text-center text-sm text-muted"
        >
          {locale === "en" ? "Finish for now" : "先完成，稍后再补"}
        </button>
      </div>
    ) : !legalView && step === 4 ? (
      <div className="space-y-2">
        <button
          disabled={draft.photos.length < 1}
          onClick={() => finish(true)}
          className="btn-grad w-full rounded-xl py-3 font-semibold disabled:opacity-40"
        >
          {locale === "en"
            ? "Save & get verified 🛡️"
            : "保存并去真人认证 🛡️"}
        </button>
        <button
          disabled={draft.photos.length < 1}
          onClick={() => finish(false, true)}
          className="w-full rounded-xl border border-line py-2.5 text-sm text-muted disabled:opacity-40"
        >
          {locale === "en"
            ? "Save & preview profile"
            : "保存并预览我的主页"}
        </button>
        <button
          type="button"
          onClick={() => setStep(3)}
          className="w-full py-1 text-center text-sm text-muted"
        >
          {locale === "en" ? "Back" : "上一步"}
        </button>
      </div>
    ) : undefined;

  return (
    <Sheet
      solid={!!legalView}
      footer={registerFooter}
      onClose={legalView ? () => setLegalView(null) : closeModals}
    >
      {legalView === "terms" && (
        <LegalInline
          title={copy.terms}
          sections={termsSections[legalLang]}
          updated={
            legalLang === "zh"
              ? "更新日期：2026-07-27（演示草案）"
              : "Updated: 2026-07-27 (draft)"
          }
          onBack={() => setLegalView(null)}
        />
      )}
      {legalView === "privacy" && (
        <LegalInline
          title={copy.privacy}
          sections={privacySections[legalLang]}
          updated={
            legalLang === "zh"
              ? "更新日期：2026-07-28（演示草案）"
              : "Updated: 2026-07-28 (draft)"
          }
          onBack={() => setLegalView(null)}
        />
      )}
      {!legalView && step === 0 && (
        <div className="pb-2">
          <h3 className="text-xl font-bold">{copy.authTitle}</h3>
          <p className="mt-1 text-sm text-muted">
            {pendingAction
              ? copy.authHintAction(pendingAction)
              : copy.authHint}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
            <button
              type="button"
              onClick={() => switchAuthRegion("CN")}
              className={`rounded-lg py-2 text-sm font-medium transition ${
                authRegion === "CN"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted"
              }`}
            >
              {copy.authRegionCN}
            </button>
            <button
              type="button"
              onClick={() => switchAuthRegion("US")}
              className={`rounded-lg py-2 text-sm font-medium transition ${
                authRegion === "US"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted"
              }`}
            >
              {copy.authRegionUS}
            </button>
          </div>

          <div className="mt-5 space-y-3">
            <label className="flex items-start gap-2.5 rounded-xl border border-line bg-surface-2/60 px-3 py-3 text-left text-[12px] leading-relaxed text-muted">
              <input
                type="checkbox"
                checked={agreedLegal}
                onChange={(e) => {
                  setAgreedLegal(e.target.checked);
                  if (e.target.checked) setAuthErr(null);
                }}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
              />
              <span>
                {copy.agreePrefix}{" "}
                <button
                  type="button"
                  className="font-medium text-accent underline-offset-2 hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setLegalView("terms");
                  }}
                >
                  {copy.terms}
                </button>{" "}
                {copy.agreeAnd}{" "}
                <button
                  type="button"
                  className="font-medium text-accent underline-offset-2 hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setLegalView("privacy");
                  }}
                >
                  {copy.privacy}
                </button>
              </span>
            </label>

            {authRegion === "US" && (
              <button
                type="button"
                disabled={authBusy || !agreedLegal}
                onClick={() => void onOAuth("google")}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface py-3.5 text-sm font-semibold disabled:opacity-40"
              >
                <span className="text-base font-bold text-[#4285F4]">G</span>
                {copy.continueGoogle}
              </button>
            )}

            <button
              type="button"
              disabled={authBusy || !agreedLegal}
              onClick={() => void onOAuth("apple")}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1c1c1f] py-3.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              <span className="text-lg leading-none"></span>
              {copy.continueApple}
            </button>

            <div className="flex items-center gap-3 py-0.5">
              <div className="h-px flex-1 bg-line" />
              <span className="text-[11px] text-muted">{copy.orDivider}</span>
              <div className="h-px flex-1 bg-line" />
            </div>

            {authRegion === "CN" && (
              <>
                {!showEmailForm ? (
                  <button
                    type="button"
                    disabled={!agreedLegal}
                    onClick={() => {
                      setShowEmailForm(true);
                      setAuthErr(null);
                    }}
                    className="w-full rounded-xl border border-line py-3.5 text-sm font-semibold disabled:opacity-40"
                  >
                    {copy.continueEmail}
                  </button>
                ) : (
                  emailAuthFields
                )}
                <p className="text-center text-[11px] leading-relaxed text-muted">
                  {copy.cnSmsBackupHint}
                </p>
              </>
            )}

            {authRegion === "US" && (
              <>
                {!showEmailForm ? (
                  <button
                    type="button"
                    disabled={!agreedLegal}
                    onClick={() => {
                      setShowEmailForm(true);
                      setAuthErr(null);
                    }}
                    className="w-full rounded-xl border border-line py-3.5 text-sm font-semibold disabled:opacity-40"
                  >
                    {copy.continueEmail}
                  </button>
                ) : (
                  emailAuthFields
                )}
                <p className="text-center text-[11px] leading-relaxed text-muted">
                  {copy.usSmsPendingHint}
                </p>
              </>
            )}

            {authErr && <p className="text-sm text-danger">{authErr}</p>}
            <p className="text-center text-[11px] text-muted">
              {copy.emailOptional}
            </p>
          </div>
        </div>
      )}

      {!legalView && step === 1 && (
        <div className="pb-2">
          <h3 className="text-xl font-bold">{copy.enterOtp}</h3>
          <p className="mt-1 text-sm text-muted">
            {authChannel === "email"
              ? copy.otpSentEmail(email.trim())
              : copy.otpSentPhone(maskE164(e164), isNewPhone)}
          </p>
          <div className="mt-5 space-y-3">
            <OtpBoxes
              value={otp}
              disabled={authBusy}
              onChange={(next) => {
                setOtp(next);
                setAuthErr(null);
              }}
              onComplete={(code) => void verifyCode(code)}
            />
            {authChannel === "phone" && allowDemoOtp() && (
              <p className="text-center text-[11px] text-muted">
                {copy.demoOtpHint}{" "}
                <span className="font-mono text-foreground">{DEMO_OTP}</span>
              </p>
            )}
            {authErr && <p className="text-sm text-danger">{authErr}</p>}
            <button
              disabled={authBusy || otp.length < OTP_LEN}
              onClick={() => void verifyCode()}
              className="w-full rounded-xl bg-[#1c1c1f] py-3.5 font-semibold text-white disabled:opacity-40"
            >
              {authBusy ? copy.verifying : copy.verifyContinue}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep(0);
                  setAuthErr(null);
                }}
                className="flex-1 rounded-xl border border-line py-2.5 text-sm text-muted"
              >
                {authChannel === "email" ? copy.changeEmail : copy.changePhone}
              </button>
              <button
                type="button"
                disabled={cooldown > 0 || authBusy}
                onClick={() =>
                  void (authChannel === "email" ? sendEmailCode() : sendCode())
                }
                className="flex-1 rounded-xl border border-line py-2.5 text-sm disabled:opacity-40"
              >
                {cooldown > 0 ? copy.resendIn(cooldown) : copy.resendCode}
              </button>
            </div>
          </div>
        </div>
      )}

      {!legalView && step === 2 && (
        <div className="pb-2">
          <div className="mb-1 text-xs text-muted">
            {locale === "en" ? "Profile 1 / 3" : "资料 1 / 3"}
          </div>
          <h3 className="text-xl font-bold">
            {locale === "en" ? "Basics" : "基本信息"}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {locale === "en"
              ? "Gender, age, and country can’t be changed later — choose carefully."
              : "性别、年龄、国家保存后不可修改，请认真填写。"}
          </p>
          <div className="mt-4">
            <ProfileBasicsFields value={draft} onChange={patch} />
          </div>
        </div>
      )}

      {!legalView && step === 3 && (
        <div className="pb-2">
          <div className="mb-1 text-xs text-muted">
            {locale === "en" ? "Profile 2 / 3" : "资料 2 / 3"}
          </div>
          <h3 className="text-xl font-bold">
            {locale === "en" ? "About you" : "关于你"}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {locale === "en"
              ? "City, work, and interests improve matches — you can fill more later."
              : "城市、职业、爱好等会提高匹配质量，可稍后再补。"}
          </p>
          <div className="mt-4">
            <ProfileAboutFields value={draft} onChange={patch} />
          </div>
        </div>
      )}

      {!legalView && step === 4 && (
        <div className="pb-2">
          <div className="mb-1 text-xs text-muted">
            {locale === "en" ? "Profile 3 / 3" : "资料 3 / 3"}
          </div>
          <h3 className="text-xl font-bold">
            {locale === "en" ? "Photos" : "照片"}
          </h3>
          <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
            <CompletenessBar profile={draft} verified={false} />
          </div>
          <div className="mt-4">
            <ProfilePhotoFields value={draft} onChange={patch} />
          </div>
        </div>
      )}
    </Sheet>
  );
}

function VerifyModal() {
  const {
    verifyOpen,
    closeModals,
    refreshTrustTier,
    locale,
    userId,
    tier,
    pendingAction,
  } = useApp();
  const en = locale === "en";
  const t = flashCopy(en);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [useFlash, setUseFlash] = useState(false);
  const [FlashUI, setFlashUI] = useState<typeof import("@/components/FlashCheck").default | null>(
    null
  );

  useEffect(() => {
    if (!verifyOpen || !userId) return;
    let cancelled = false;
    setLoadingStatus(true);
    setErr(null);
    setUseFlash(false);
    (async () => {
      try {
        await refreshTrustTier();
        const [statusRes, cfgRes] = await Promise.all([
          fetch("/api/verify/status"),
          fetch("/api/verify/liveness/config"),
        ]);
        const data = await statusRes.json();
        const cfg = await cfgRes.json();
        if (cancelled) return;
        if (statusRes.ok) {
          setStatus(data.status || (data.verified ? "approved" : null));
          setAdminNote(data.request?.adminNote || null);
        }
        setFlashEnabled(Boolean(cfg.enabled));
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoadingStatus(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [verifyOpen, userId, refreshTrustTier]);

  useEffect(() => {
    if (!useFlash || FlashUI) return;
    void import("@/components/FlashCheck").then((m) => setFlashUI(() => m.default));
  }, [useFlash, FlashUI]);

  const onFlashApproved = useCallback(async () => {
    await refreshTrustTier();
    setStatus("approved");
    setUseFlash(false);
  }, [refreshTrustTier]);

  const onFlashPending = useCallback(() => {
    setStatus("pending");
    setUseFlash(false);
  }, []);

  const onFlashError = useCallback(
    (message: string) => {
      setErr(localizeVerifyError(message, en));
      setUseFlash(false);
    },
    [en]
  );

  const onFlashCancel = useCallback(() => {
    setUseFlash(false);
  }, []);

  if (!verifyOpen) return null;

  const alreadyVerified = tier === "verified" || status === "approved";
  const pending = status === "pending";
  const title = t.full;
  const hint = en
    ? "A quick on-camera check to confirm you’re a real person. No government ID. You’ll get a verified badge."
    : "对着镜头做几个小动作，确认是真人本人。不采集证件。通过后展示「已认证」徽章。";
  const pendingActionHint =
    pendingAction && !en
      ? `完成闪验后可继续：${pendingAction}`
      : pendingAction && en
        ? `After Flash Check you can continue: ${pendingAction}`
        : null;

  // Full-screen portal so Amplify oval hints are not clipped by Sheet overflow/transform
  if (useFlash && FlashUI && typeof document !== "undefined") {
    return createPortal(
      <div className="fixed inset-0 z-[80] bg-background">
        <FlashUI
          en={en}
          onApproved={onFlashApproved}
          onPending={onFlashPending}
          onError={onFlashError}
          onCancel={onFlashCancel}
        />
      </div>,
      document.body
    );
  }

  const onPick = async (file: File | null) => {
    if (!file) return;
    setErr(null);
    try {
      const { compressImageFile } = await import("@/lib/photoUpload");
      const url = await compressImageFile(file);
      setPreview(url);
    } catch {
      setErr(en ? "Could not read photo" : "无法读取照片");
    }
  };

  const onSubmit = async () => {
    if (!preview) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/verify/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selfieDataUrl: preview }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          localizeVerifyError(data.error || "", en) ||
            (en ? "Submit failed" : "提交失败")
        );
      }
      setStatus("pending");
      setPreview(null);
    } catch (e) {
      setErr(
        e instanceof Error
          ? localizeVerifyError(e.message, en)
          : en
            ? "Submit failed"
            : "提交失败"
      );
    } finally {
      setBusy(false);
    }
  };

  const startFlash = () => {
    setErr(null);
    setStatus(null);
    setUseFlash(true);
  };

  const verifyFooter =
    loadingStatus || alreadyVerified ? (
      <button
        type="button"
        onClick={closeModals}
        className="w-full rounded-xl py-2.5 text-sm text-muted"
      >
        {en ? "Close" : "关闭"}
      </button>
    ) : flashEnabled ? (
      <div className="space-y-2">
        <button
          type="button"
          onClick={startFlash}
          className="btn-grad w-full rounded-xl py-3.5 text-base font-semibold shadow-[0_10px_28px_rgba(200,120,180,0.35)]"
        >
          {pending ? (en ? "Try Flash Check again" : t.again) : t.start}
        </button>
        <button
          type="button"
          onClick={closeModals}
          className="w-full py-1.5 text-center text-sm text-muted"
        >
          {en ? "Later" : "稍后再说"}
        </button>
      </div>
    ) : (
      <div className="space-y-2">
        {preview ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onSubmit()}
            className="btn-grad w-full rounded-xl py-3.5 font-semibold disabled:opacity-40"
          >
            {busy
              ? en
                ? "Submitting…"
                : "提交中…"
              : en
                ? "Submit for review"
                : "提交审核"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={closeModals}
          className="w-full py-1.5 text-center text-sm text-muted"
        >
          {en ? "Later" : "稍后再说"}
        </button>
      </div>
    );

  return (
    <Sheet onClose={closeModals} footer={verifyFooter}>
      <>
        <h3 className="text-xl font-bold tracking-tight">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{hint}</p>
        {pendingActionHint && (
          <p className="mt-3 rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent">
            {pendingActionHint}
          </p>
        )}

        {loadingStatus ? (
          <p className="mt-6 text-sm text-muted">
            {en ? "Checking…" : "查询状态…"}
          </p>
        ) : alreadyVerified ? (
          <p className="mt-6 rounded-xl bg-accent/10 px-3 py-3 text-sm text-foreground">
            {en
              ? "Flash Check complete — you’re verified."
              : "闪验已通过，你已获得认证徽章。"}
          </p>
        ) : pending ? (
          <div className="mt-5 space-y-3">
            <p className="rounded-xl bg-amber-500/10 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-100">
              {en
                ? "A previous check is awaiting TalkLov staff review. You can run Flash Check again for an instant result."
                : "上次闪验还在等待人工复核。你可以马上重新闪验，通常会由系统当场出结果。"}
            </p>
            {err && (
              <p className="text-sm text-rose-600 dark:text-rose-300">{err}</p>
            )}
          </div>
        ) : (
          <>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent"
                  aria-hidden
                >
                  1
                </span>
                <span>
                  {en
                    ? "Short motion selfie — never shown publicly"
                    : "几秒动态自拍，不公开展示"}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent"
                  aria-hidden
                >
                  2
                </span>
                <span>
                  {en ? "Verified badge after you pass" : "通过后获得认证徽章"}
                </span>
              </li>
              <li className="flex items-start gap-3 text-muted">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-bold"
                  aria-hidden
                >
                  3
                </span>
                <span>
                  {en ? "No government ID required" : "不采集证件实名"}
                </span>
              </li>
            </ul>

            {status === "rejected" && (
              <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-200">
                {en ? "Previous Flash Check didn’t pass." : "上次闪验未通过。"}
                {adminNote ? ` ${adminNote}` : ""}
                {en ? " You can try again." : " 可重新尝试。"}
              </p>
            )}

            {err && (
              <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">
                {err}
              </p>
            )}

            {!flashEnabled && (
              <>
                <p className="mt-4 text-xs text-muted">
                  {en
                    ? "Flash Check service offline — use secure selfie upload."
                    : "闪验服务未开通时，可走安全自拍通道。"}
                </p>
                <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-black/15 bg-black/[0.03] px-4 py-6 text-sm dark:border-white/15 dark:bg-white/[0.04]">
                  <span className="font-medium">
                    {preview
                      ? en
                        ? "Tap to retake"
                        : "点击重拍"
                      : en
                        ? "Take / upload selfie"
                        : "拍摄或上传自拍"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
                  />
                </label>
                {preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt="selfie preview"
                    className="mt-3 max-h-56 w-full rounded-xl object-contain bg-black/5"
                  />
                )}
              </>
            )}
          </>
        )}
      </>
    </Sheet>
  );
}

export default function Modals() {
  const pathname = usePathname();
  // Admin console shares root layout — never show consumer register/verify sheets there.
  if (pathname?.startsWith("/admin")) return null;
  return (
    <>
      <RegisterModal />
      <VerifyModal />
    </>
  );
}
