"use client";

import { useEffect, useState } from "react";
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
  DIAL_OPTIONS,
  type DialCode,
  dialMeta,
  isValidNational,
  maskE164,
} from "@/lib/phone";

function Sheet({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div className="animate-modalIn relative flex max-h-[min(92vh,720px)] w-full max-w-[420px] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="overflow-y-auto px-5 pb-7 pt-6">{children}</div>
      </div>
    </div>
  );
}

function RegisterModal() {
  const {
    registerOpen,
    closeModals,
    completeRegister,
    pendingAction,
    myProfile,
    openVerify,
    sendPhoneOtp,
    verifyPhoneOtp,
    setLocale,
  } = useApp();
  const [step, setStep] = useState(0); // 0 phone, 1 otp, 2 basics, 3 about, 4 photos
  const [draft, setDraft] = useState<MyProfile>({ ...defaultMyProfile });
  const [dial, setDial] = useState<DialCode>("+86");
  const [national, setNational] = useState("");
  const [e164, setE164] = useState("");
  const [otp, setOtp] = useState("");
  const [isNewPhone, setIsNewPhone] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authErr, setAuthErr] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!registerOpen) {
      setStep(0);
      setNational("");
      setOtp("");
      setAuthErr(null);
      setDraft({ ...defaultMyProfile, ...myProfile, phoneE164: myProfile.phoneE164 || "" });
    }
  }, [registerOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!registerOpen) return null;

  const patch = (p: Partial<MyProfile>) =>
    setDraft((d) => ({ ...d, ...p }));

  const onDialChange = (d: DialCode) => {
    setDial(d);
    const meta = dialMeta(d);
    setLocale(meta.locale);
    if (!draft.basicsLocked) {
      patch({
        country: meta.country,
        nativeLang: meta.locale === "zh" ? "中文" : "English",
        learningLang: meta.locale === "zh" ? "English" : "中文",
        chineseVariants: meta.locale === "zh" ? ["mandarin"] : [],
      });
    }
  };

  const sendCode = async () => {
    setAuthErr(null);
    setAuthBusy(true);
    const res = await sendPhoneOtp(dial, national);
    setAuthBusy(false);
    if (!res.ok) {
      setAuthErr(res.error ?? "发送失败");
      return;
    }
    setE164(res.e164 ?? "");
    setIsNewPhone(res.isNew !== false);
    setStep(1);
    setCooldown(60);
    setOtp("");
  };

  const verifyCode = async () => {
    setAuthErr(null);
    setAuthBusy(true);
    const res = await verifyPhoneOtp(e164, otp);
    setAuthBusy(false);
    if (!res.ok) {
      setAuthErr(res.error ?? "验证失败");
      return;
    }
    const meta = dialMeta(dial);
    setDraft((d) => ({
      ...d,
      phoneE164: e164,
      country: d.basicsLocked ? d.country : meta.country,
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
    if (res.needProfile) {
      setStep(2);
    } else {
      closeModals();
    }
  };

  const finish = (goVerify: boolean) => {
    completeRegister({ ...draft, phoneE164: e164 || draft.phoneE164, basicsLocked: true });
    if (goVerify) openVerify("展示已验证标签");
  };

  const canBasics =
    draft.name.trim().length > 0 &&
    draft.age !== null &&
    draft.age >= 18 &&
    draft.age <= 99 &&
    draft.intents.length > 0;

  const phoneOk = isValidNational(dial, national);

  return (
    <Sheet onClose={closeModals}>
      {step === 0 && (
        <div className="pb-2">
          <h3 className="text-xl font-bold">手机号验证码登录</h3>
          <p className="mt-1 text-sm text-muted">
            {pendingAction
              ? `验证手机号即可${pendingAction}。`
              : "一个手机号只能注册一个账号，防刷更干净。"}
          </p>

          <div className="mt-5 space-y-3">
            <div className="flex gap-2">
              <select
                value={dial}
                onChange={(e) => onDialChange(e.target.value as DialCode)}
                className="w-[7.5rem] shrink-0 rounded-xl border border-line bg-surface-2 px-2 py-3 text-sm outline-none focus:border-accent"
              >
                {DIAL_OPTIONS.map((o) => (
                  <option key={o.dial} value={o.dial}>
                    {o.flag} {o.dial}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                inputMode="numeric"
                value={national}
                onChange={(e) => setNational(e.target.value)}
                placeholder={dial === "+86" ? "手机号" : "Phone number"}
                autoComplete="tel-national"
                onKeyDown={(e) => e.key === "Enter" && phoneOk && sendCode()}
                className="min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-4 py-3 outline-none focus:border-accent"
              />
            </div>
            {authErr && <p className="text-sm text-danger">{authErr}</p>}
            <button
              disabled={authBusy || !phoneOk}
              onClick={sendCode}
              className="w-full rounded-xl bg-[#1c1c1f] py-3.5 font-semibold text-white disabled:opacity-40"
            >
              {authBusy ? "发送中…" : "获取验证码"}
            </button>
            <p className="text-center text-[11px] text-muted">
              邮箱可在注册后于「我的 → 隐私与安全」中绑定（可选）
            </p>
          </div>
          <p className="mt-4 text-center text-[11px] text-muted">
            注册即代表同意《用户协议》与《隐私政策》
          </p>
        </div>
      )}

      {step === 1 && (
        <div className="pb-2">
          <h3 className="text-xl font-bold">输入验证码</h3>
          <p className="mt-1 text-sm text-muted">
            已发送至 {maskE164(e164)}
            {isNewPhone ? " · 新账号" : " · 登录已有账号"}
          </p>
          <div className="mt-5 space-y-3">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="6 位验证码"
              onKeyDown={(e) => e.key === "Enter" && otp.length >= 4 && verifyCode()}
              className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-center text-lg tracking-[0.35em] outline-none focus:border-accent"
            />
            <p className="text-center text-[11px] text-muted">
              未接短信时可用演示码 <span className="font-mono text-foreground">{DEMO_OTP}</span>
              （未开通 SMS 时）
            </p>
            {authErr && <p className="text-sm text-danger">{authErr}</p>}
            <button
              disabled={authBusy || otp.length < 4}
              onClick={verifyCode}
              className="w-full rounded-xl bg-[#1c1c1f] py-3.5 font-semibold text-white disabled:opacity-40"
            >
              {authBusy ? "验证中…" : "验证并继续"}
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setStep(0);
                  setAuthErr(null);
                }}
                className="flex-1 rounded-xl border border-line py-2.5 text-sm text-muted"
              >
                改号码
              </button>
              <button
                disabled={cooldown > 0 || authBusy}
                onClick={sendCode}
                className="flex-1 rounded-xl border border-line py-2.5 text-sm disabled:opacity-40"
              >
                {cooldown > 0 ? `${cooldown}s 后重发` : "重新发送"}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="pb-2">
          <div className="mb-1 text-xs text-muted">资料 1 / 3</div>
          <h3 className="text-xl font-bold">基本信息</h3>
          <p className="mt-1 text-sm text-muted">
            性别、年龄、国家保存后不可修改，请认真填写。
          </p>
          <div className="mt-4">
            <ProfileBasicsFields value={draft} onChange={patch} />
          </div>
          <button
            disabled={!canBasics}
            onClick={() => setStep(3)}
            className="btn-grad mt-5 w-full rounded-xl py-3 font-semibold disabled:opacity-40"
          >
            下一步 →
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="pb-2">
          <div className="mb-1 text-xs text-muted">资料 2 / 3</div>
          <h3 className="text-xl font-bold">关于你</h3>
          <p className="mt-1 text-sm text-muted">
            城市、职业、爱好等会提高匹配质量，可稍后再补。
          </p>
          <div className="mt-4">
            <ProfileAboutFields value={draft} onChange={patch} />
          </div>
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => setStep(2)}
              className="flex-1 rounded-xl border border-line py-3 text-sm"
            >
              上一步
            </button>
            <button
              onClick={() => setStep(4)}
              className="btn-grad flex-[2] rounded-xl py-3 font-semibold"
            >
              下一步 →
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="pb-2">
          <div className="mb-1 text-xs text-muted">资料 3 / 3</div>
          <h3 className="text-xl font-bold">照片</h3>
          <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
            <CompletenessBar profile={draft} verified={false} />
          </div>
          <div className="mt-4">
            <ProfilePhotoFields value={draft} onChange={patch} />
          </div>
          <div className="mt-5 space-y-2">
            <button
              disabled={draft.photos.length < 1}
              onClick={() => finish(true)}
              className="btn-grad w-full rounded-xl py-3 font-semibold disabled:opacity-40"
            >
              保存并去真人认证 🛡️
            </button>
            <button
              disabled={draft.photos.length < 1}
              onClick={() => finish(false)}
              className="w-full rounded-xl border border-line py-2.5 text-sm text-muted disabled:opacity-40"
            >
              稍后再认证，先去打招呼 →
            </button>
            <button
              onClick={() => setStep(3)}
              className="w-full py-1 text-center text-sm text-muted"
            >
              上一步
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function VerifyModal() {
  const { verifyOpen, closeModals, completeVerify } = useApp();
  if (!verifyOpen) return null;

  return (
    <Sheet onClose={closeModals}>
      <h3 className="text-xl font-bold">完成真人认证 🛡️</h3>
      <p className="mt-1 text-sm text-muted">
        通过后资料会展示「✓ 已认证」标签，信任度更高。只做自拍活体，不采集证件实名。
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        <li className="flex items-center gap-2">
          <span>📸</span> 自拍活体检测（确认是真人本人）
        </li>
        <li className="flex items-center gap-2">
          <span>✅</span> 获得认证徽章，展示给其他用户
        </li>
        <li className="flex items-center gap-2 text-muted">
          <span>🔒</span> 自拍仅用于比对，不公开展示
        </li>
      </ul>
      <button
        onClick={completeVerify}
        className="btn-grad mt-6 w-full rounded-xl py-3 font-semibold"
      >
        开始真人认证（模拟）
      </button>
      <button
        onClick={closeModals}
        className="mt-2 w-full rounded-xl py-2 text-sm text-muted"
      >
        稍后再说
      </button>
    </Sheet>
  );
}

export default function Modals() {
  return (
    <>
      <RegisterModal />
      <VerifyModal />
    </>
  );
}
