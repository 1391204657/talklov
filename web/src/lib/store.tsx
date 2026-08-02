"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { Tier, PhotoPrivacy } from "./types";
import { isSupabaseConfigured } from "./supabase/config";
import { getSupabaseBrowser } from "./supabase/client";
import {
  fetchDbProfile,
  fetchMyProfileSecrets,
  dbToMyPartial,
  myProfileToDbPatch,
  upsertMyProfile,
  isPhoneTaken,
} from "./db";
import { fetchMyBanStatus } from "./moderation";
import { defaultMyProfile, type MyProfile } from "./profile";
import {
  DEMO_OTP,
  dialMeta,
  type DialCode,
  isValidNational,
  toE164,
} from "./phone";
import {
  allowDemoOtp,
  authCallbackUrl,
  isValidEmail,
  type OAuthProvider,
} from "./authHelpers";
import {
  defaultNotifyPrefs,
  type NotifyPrefs,
  requestNotifyPermission,
  setAppBadgeCount,
} from "./notify";

type Theme = "dark" | "light";
type Locale = "zh" | "en";

const KEY = "nihello_state_v1";
const PHONE_MAP_KEY = "nihello_phone_map_v1";
const NOTIFY_KEY = "nihello_notify_v1";

type PhoneMap = Record<
  string,
  { userId: string; profileComplete: boolean }
>;

function readPhoneMap(): PhoneMap {
  try {
    return JSON.parse(localStorage.getItem(PHONE_MAP_KEY) || "{}");
  } catch {
    return {};
  }
}

function writePhoneMap(map: PhoneMap) {
  try {
    localStorage.setItem(PHONE_MAP_KEY, JSON.stringify(map));
  } catch {}
}

function newLocalId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}`;
}

interface AppState {
  tier: Tier;
  region: "CN" | "global";
  installed: boolean;
  theme: Theme;
  locale: Locale;
  myProfile: MyProfile;
  configured: boolean;
  userId: string | null;
  /** Auth email from Supabase session (OAuth / email login / linked). */
  authEmail: string | null;
  registerOpen: boolean;
  /** When opening register modal, jump to this step (2 = profile basics). */
  registerStartStep: number;
  verifyOpen: boolean;
  pendingAction: string | null;
  pendingHelloId: string | null;
  openRegister: (action?: string, helloId?: string) => void;
  openVerify: (action?: string) => void;
  closeModals: () => void;
  clearPendingHello: () => void;
  completeRegister: (p: Partial<MyProfile>) => void;
  updateMyProfile: (p: Partial<MyProfile>) => void;
  /** Refresh trust tier from DB after admin approval (no client self-verify). */
  refreshTrustTier: () => Promise<void>;
  /** Password email auth (legacy); prefer OTP / OAuth. */
  emailAuth: (
    mode: "signin" | "signup",
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  signInWithOAuth: (
    provider: OAuthProvider
  ) => Promise<{ ok: boolean; error?: string }>;
  sendEmailOtp: (
    email: string
  ) => Promise<{ ok: boolean; error?: string }>;
  verifyEmailOtp: (
    email: string,
    code: string
  ) => Promise<{ ok: boolean; error?: string; needProfile?: boolean }>;
  /** Link / change email on an existing session (sends confirmation). */
  linkEmail: (email: string) => Promise<{ ok: boolean; error?: string }>;
  sendPhoneOtp: (
    dial: DialCode,
    national: string
  ) => Promise<{ ok: boolean; error?: string; e164?: string; isNew?: boolean }>;
  verifyPhoneOtp: (
    e164: string,
    code: string
  ) => Promise<{ ok: boolean; error?: string; needProfile?: boolean }>;
  signOut: () => Promise<void>;
  setInstalled: (v: boolean) => void;
  setRegion: (r: "CN" | "global") => void;
  setPhotoPrivacy: (p: PhotoPrivacy) => void;
  setTheme: (t: Theme) => void;
  setLocale: (l: Locale) => void;
  toggleTheme: () => void;
  notifyPrefs: NotifyPrefs;
  setNotifyPrefs: (p: Partial<NotifyPrefs>) => Promise<{ ok: boolean; error?: string }>;
  applyUnreadBadge: (count: number) => void;
  reset: () => void;
  /** Soft-ban status from am_i_banned RPC */
  isBanned: boolean;
  banReason: string | null;
  refreshBanStatus: () => Promise<void>;
}

const AppCtx = createContext<AppState | null>(null);

function persistProfile(uid: string | null, p: Partial<MyProfile>) {
  if (!isSupabaseConfigured || !uid) return;
  upsertMyProfile(myProfileToDbPatch(uid, p)).catch(() => {});
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [tier, setTier] = useState<Tier>("guest");
  const [region, setRegion] = useState<"CN" | "global">("global");
  const [installed, setInstalled] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [locale, setLocale] = useState<Locale>("zh");
  const [myProfile, setMyProfile] = useState<MyProfile>(defaultMyProfile);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerStartStep, setRegisterStartStep] = useState(0);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [pendingHelloId, setPendingHelloId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [notifyPrefs, setNotifyPrefsState] = useState<NotifyPrefs>(defaultNotifyPrefs);
  const [hydrated, setHydrated] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const registerOpenRef = useRef(false);
  registerOpenRef.current = registerOpen;

  const profileNeedsBasics = (name?: string | null, age?: number | null) =>
    !(name && String(name).trim()) || age == null || age < 18;

  const refreshBanStatus = async () => {
    if (!userId) {
      setIsBanned(false);
      setBanReason(null);
      return;
    }
    const s = await fetchMyBanStatus();
    setIsBanned(s.banned);
    setBanReason(s.banReason);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        const phone = (s.myProfile?.phoneE164 as string | undefined) ?? "";
        const savedTier = (s.tier as Tier | undefined) ?? "guest";
        const savedUid = (s.userId as string | null | undefined) ?? null;
        // Phone / saved session should never stay stuck as guest after refresh
        const nextTier =
          savedTier === "verified"
            ? "verified"
            : savedTier === "light" || phone || savedUid
              ? "light"
              : "guest";
        setTier(nextTier);
        if (savedUid) setUserId(savedUid);
        setRegion(s.region ?? "global");
        setInstalled(s.installed ?? false);
        setTheme(s.theme ?? "light");
        setLocale(s.locale === "en" ? "en" : "zh");
        setMyProfile({
          ...defaultMyProfile,
          ...(s.myProfile ?? {}),
          chineseVariants: s.myProfile?.chineseVariants ?? [],
          phoneE164: phone,
          voiceIntroUrl: s.myProfile?.voiceIntroUrl ?? "",
        });
      }
      const nRaw = localStorage.getItem(NOTIFY_KEY);
      if (nRaw) {
        setNotifyPrefsState({ ...defaultNotifyPrefs, ...JSON.parse(nRaw) });
      }
      // One-time: message notifications default ON (was false in early builds)
      if (!localStorage.getItem("talklov_notify_push_default_v1")) {
        setNotifyPrefsState((prev) => ({ ...prev, push: true }));
        localStorage.setItem("talklov_notify_push_default_v1", "1");
      }
    } catch {}
    setHydrated(true);
  }, []);

  // Don't persist until hydrated — otherwise first paint (guest) wipes saved login
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          tier,
          region,
          installed,
          theme,
          locale,
          myProfile,
          userId,
        })
      );
    } catch {
      // Quota exceeded: persist profile without bulky data: photos so app still works.
      try {
        localStorage.setItem(
          KEY,
          JSON.stringify({
            tier,
            region,
            installed,
            theme,
            locale,
            userId,
            myProfile: {
              ...myProfile,
              photos: myProfile.photos.filter((u) => !u.startsWith("data:")),
            },
          })
        );
      } catch {}
    }
  }, [hydrated, tier, region, installed, theme, locale, myProfile, userId]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = locale === "en" ? "en" : "zh-CN";
  }, [locale]);

  useEffect(() => {
    try {
      localStorage.setItem(NOTIFY_KEY, JSON.stringify(notifyPrefs));
    } catch {}
  }, [notifyPrefs]);

  const setNotifyPrefs = async (p: Partial<NotifyPrefs>) => {
    let next = { ...notifyPrefs, ...p };
    if (p.push === true) {
      const perm = await requestNotifyPermission();
      if (perm !== "granted") {
        next = { ...next, push: false };
        setNotifyPrefsState(next);
        return {
          ok: false,
          error: perm === "unsupported" ? "unsupported" : "denied",
        };
      }
      next = { ...next, push: true };
    }
    if (p.badge === false) {
      void setAppBadgeCount(0, false);
    }
    setNotifyPrefsState(next);
    return { ok: true };
  };

  const applyUnreadBadge = (count: number) => {
    void setAppBadgeCount(count, notifyPrefs.badge);
  };

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabaseBrowser();
    if (!sb) return;

    const applyUser = async (
      uid: string | null,
      email?: string | null
    ): Promise<boolean> => {
      // No Supabase session: keep offline/demo phone login from localStorage.
      // Only signOut() should clear tier — otherwise kill-app relaunches wipe login.
      if (!uid) return false;

      setUserId(uid);
      if (email !== undefined) setAuthEmail(email || null);
      try {
        const [raw, secrets] = await Promise.all([
          fetchDbProfile(uid),
          fetchMyProfileSecrets().catch(() => ({
            phoneE164: "",
            stripeCustomerId: null,
          })),
        ]);
        if (raw) {
          const fromDb = dbToMyPartial(raw);
          setMyProfile((prev) => ({
            ...prev,
            ...fromDb,
            // Keep locally uploaded data: photos if DB has none (Storage not wired yet)
            photos:
              fromDb.photos && fromDb.photos.length > 0
                ? fromDb.photos
                : prev.photos?.length
                  ? prev.photos
                  : [],
            // Phone only via my_profile_secrets RPC (column revoked on profiles)
            phoneE164:
              secrets.phoneE164 || fromDb.phoneE164 || prev.phoneE164 || "",
            voiceIntroUrl: prev.voiceIntroUrl || "",
          }));
          setTier(raw.verified ? "verified" : "light");
          const ban = await fetchMyBanStatus();
          setIsBanned(ban.banned);
          setBanReason(ban.banReason);
          return profileNeedsBasics(raw.name, raw.age);
        }
        setTier((t) => (t === "guest" ? "light" : t));
        setIsBanned(false);
        setBanReason(null);
        return true;
      } catch {
        setTier((t) => (t === "guest" ? "light" : t));
        return false;
      }
    };

    const finishOAuthLanding = (needProfile: boolean, event: string) => {
      if (
        needProfile &&
        (event === "SIGNED_IN" ||
          event === "USER_UPDATED" ||
          event === "INITIAL_SESSION") &&
        !registerOpenRef.current
      ) {
        setRegisterStartStep(2);
        setRegisterOpen(true);
      }
      // Clean ?auth=1 from URL after session applied
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has("auth") || url.searchParams.has("auth_error")) {
          url.searchParams.delete("auth");
          url.searchParams.delete("auth_error");
          url.searchParams.delete("msg");
          window.history.replaceState({}, "", url.pathname + url.search + url.hash);
        }
      } catch {
        /* ignore */
      }
    };

    sb.auth.getUser().then(async ({ data }) => {
      const need = await applyUser(
        data.user?.id ?? null,
        data.user?.email ?? null
      );
      if (
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("auth") === "1"
      ) {
        finishOAuthLanding(need, "INITIAL_SESSION");
      }
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      // Ignore transient signed-out noise during token refresh; SIGNED_OUT is explicit
      if (event === "INITIAL_SESSION" && !session?.user) return;
      if (event === "SIGNED_OUT") {
        // Don't force guest here if local demo login exists — signOut() handles it
        setAuthEmail(null);
        return;
      }
      void (async () => {
        const need = await applyUser(
          session?.user?.id ?? null,
          session?.user?.email ?? null
        );
        finishOAuthLanding(need, event);
      })();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const openRegister = (action?: string, helloId?: string) => {
    setPendingAction(action ?? null);
    if (helloId) setPendingHelloId(helloId);
    setRegisterStartStep(0);
    setVerifyOpen(false);
    setRegisterOpen(true);
  };
  const clearPendingHello = () => setPendingHelloId(null);
  const openVerify = (action?: string) => {
    setPendingAction(action ?? null);
    setRegisterOpen(false);
    setVerifyOpen(true);
  };
  const closeModals = () => {
    setRegisterOpen(false);
    setRegisterStartStep(0);
    setVerifyOpen(false);
  };

  const updateMyProfile = (p: Partial<MyProfile>) => {
    setMyProfile((prev) => {
      const next = { ...prev, ...p };
      if (prev.basicsLocked) {
        next.gender = prev.gender;
        next.age = prev.age;
        next.country = prev.country;
        next.basicsLocked = true;
      }
      persistProfile(userId, next);
      return next;
    });
  };

  const completeRegister = (p: Partial<MyProfile>) => {
    setMyProfile((prev) => {
      const next: MyProfile = {
        ...prev,
        ...p,
        basicsLocked: true,
      };
      persistProfile(userId, next);
      // Mark offline phone map profile as complete
      if (next.phoneE164) {
        const map = readPhoneMap();
        if (map[next.phoneE164]) {
          map[next.phoneE164].profileComplete = true;
          writePhoneMap(map);
        }
      }
      return next;
    });
    setTier((t) => (t === "guest" ? "light" : t));
    setRegisterOpen(false);
  };

  const refreshTrustTier = async () => {
    if (!isSupabaseConfigured || !userId) return;
    try {
      const raw = await fetchDbProfile(userId);
      if (raw) setTier(raw.verified ? "verified" : "light");
    } catch {
      /* ignore */
    }
  };

  const emailAuth = async (
    mode: "signin" | "signup",
    email: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const sb = getSupabaseBrowser();
    if (!sb) return { ok: false, error: "后端未配置" };
    const { data, error } =
      mode === "signup"
        ? await sb.auth.signUp({ email, password })
        : await sb.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    if (data.user) {
      setUserId(data.user.id);
      setAuthEmail(data.user.email ?? email);
    }
    return { ok: true };
  };

  const signInWithOAuth = async (
    provider: OAuthProvider
  ): Promise<{ ok: boolean; error?: string }> => {
    const sb = getSupabaseBrowser();
    if (!sb || !isSupabaseConfigured) {
      return {
        ok: false,
        error:
          locale === "en"
            ? "Backend not configured"
            : "后端未配置，无法使用第三方登录",
      };
    }
    const { error } = await sb.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: authCallbackUrl("/discover"),
        skipBrowserRedirect: false,
      },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const sendEmailOtp = async (
    email: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      return {
        ok: false,
        error: locale === "en" ? "Enter a valid email" : "请输入正确的邮箱",
      };
    }
    const sb = getSupabaseBrowser();
    if (!sb || !isSupabaseConfigured) {
      return { ok: false, error: locale === "en" ? "Backend not configured" : "后端未配置" };
    }
    const { error } = await sb.auth.signInWithOtp({
      email: trimmed,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: authCallbackUrl("/discover"),
      },
    });
    if (error) {
      const msg = error.message || "";
      const friendly =
        /magic link|sending|smtp|email/i.test(msg)
          ? locale === "en"
            ? "Could not send email. Check Supabase SMTP (Resend) settings and try again."
            : "邮件发送失败。请检查 Supabase → Emails → SMTP（Resend）是否已开启并保存正确，然后重试。"
          : msg;
      return { ok: false, error: friendly };
    }
    try {
      sessionStorage.setItem("nihello_pending_email", trimmed);
    } catch {}
    return { ok: true };
  };

  const verifyEmailOtp = async (
    email: string,
    code: string
  ): Promise<{ ok: boolean; error?: string; needProfile?: boolean }> => {
    const trimmed = email.trim().toLowerCase();
    const token = code.trim();
    if (!isValidEmail(trimmed)) {
      return { ok: false, error: locale === "en" ? "Enter a valid email" : "请输入正确的邮箱" };
    }
    const normalized = token.replace(/\D/g, "");
    if (!/^\d{6,10}$/.test(normalized)) {
      return { ok: false, error: locale === "en" ? "Enter the 6-digit code" : "请输入 6 位验证码" };
    }
    const sb = getSupabaseBrowser();
    if (!sb || !isSupabaseConfigured) {
      return { ok: false, error: locale === "en" ? "Backend not configured" : "后端未配置" };
    }
    const { data, error } = await sb.auth.verifyOtp({
      email: trimmed,
      token: normalized,
      type: "email",
    });
    if (error) return { ok: false, error: error.message };
    const uid = data.user?.id;
    if (!uid) return { ok: false, error: locale === "en" ? "Verification failed" : "验证失败" };

    setUserId(uid);
    setAuthEmail(data.user?.email ?? trimmed);
    setTier("light");

    let needProfile = true;
    try {
      const raw = await fetchDbProfile(uid);
      if (raw) {
        setMyProfile((prev) => ({ ...prev, ...dbToMyPartial(raw) }));
        setTier(raw.verified ? "verified" : "light");
        needProfile = profileNeedsBasics(raw.name, raw.age);
      }
    } catch {
      /* new user */
    }
    return { ok: true, needProfile };
  };

  const linkEmail = async (
    email: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      return {
        ok: false,
        error: locale === "en" ? "Enter a valid email" : "请输入正确的邮箱",
      };
    }
    const sb = getSupabaseBrowser();
    if (!sb || !isSupabaseConfigured) {
      return { ok: false, error: locale === "en" ? "Backend not configured" : "后端未配置" };
    }
    const { error } = await sb.auth.updateUser({ email: trimmed });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const sendPhoneOtp = async (
    dial: DialCode,
    national: string
  ): Promise<{ ok: boolean; error?: string; e164?: string; isNew?: boolean }> => {
    if (!isValidNational(dial, national)) {
      return {
        ok: false,
        error: locale === "en" ? "Enter a valid phone number" : "请输入正确的手机号",
      };
    }
    const e164 = toE164(dial, national);
    const meta = dialMeta(dial);
    setLocale(meta.locale);
    setRegion(meta.country === "CN" ? "CN" : "global");

    // Mainland CN: do not pretend SMS works without a domestic provider
    if (dial === "+86" && isSupabaseConfigured && !allowDemoOtp()) {
      return {
        ok: false,
        error:
          locale === "en"
            ? "SMS to +86 is not available yet. Use Apple or email login."
            : "大陆手机短信暂未开通，请使用 Apple 或邮箱验证码登录。",
      };
    }

    const runDemo = () => {
      if (!allowDemoOtp()) {
        return {
          ok: false as const,
          error:
            locale === "en"
              ? "SMS is not configured. Connect Twilio in Supabase Auth → Phone, or set NEXT_PUBLIC_ALLOW_DEMO_OTP=1 for testing."
              : "短信未配置。请在 Supabase Auth → Phone 接入 Twilio，或设置 NEXT_PUBLIC_ALLOW_DEMO_OTP=1 用于测试。",
        };
      }
      const map = readPhoneMap();
      const isNew = !map[e164];
      try {
        sessionStorage.setItem("nihello_pending_phone", e164);
        sessionStorage.setItem("nihello_otp_demo", "1");
      } catch {}
      return { ok: true as const, e164, isNew };
    };

    if (!isSupabaseConfigured) return runDemo();

    const sb = getSupabaseBrowser();
    if (!sb) return runDemo();

    let isNew = true;
    try {
      isNew = !(await isPhoneTaken(e164));
    } catch {
      /* RPC may not exist until migration — continue */
    }

    const { error } = await sb.auth.signInWithOtp({ phone: e164 });
    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes("phone") ||
        msg.includes("sms") ||
        msg.includes("provider") ||
        msg.includes("disabled")
      ) {
        return runDemo();
      }
      return { ok: false, error: error.message };
    }
    try {
      sessionStorage.setItem("nihello_pending_phone", e164);
      sessionStorage.removeItem("nihello_otp_demo");
    } catch {}
    return { ok: true, e164, isNew };
  };

  const verifyPhoneOtp = async (
    e164: string,
    code: string
  ): Promise<{ ok: boolean; error?: string; needProfile?: boolean }> => {
    const trimmed = code.trim();
    if (!/^\d{4,8}$/.test(trimmed)) {
      return { ok: false, error: "请输入验证码" };
    }

    const demo =
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem("nihello_otp_demo") === "1";

    // —— Demo / offline ——
    if (!isSupabaseConfigured || (demo && allowDemoOtp())) {
      if (trimmed !== DEMO_OTP) {
        return { ok: false, error: `演示验证码为 ${DEMO_OTP}` };
      }
      const map = readPhoneMap();
      let entry = map[e164];
      if (!entry) {
        // One phone → one account: create only if never seen
        entry = { userId: newLocalId(), profileComplete: false };
        map[e164] = entry;
        writePhoneMap(map);
      }
      setUserId(entry.userId);
      setTier("light");
      setMyProfile((prev) => ({
        ...prev,
        phoneE164: e164,
        // Soft-default country from dial if still empty basics
        country:
          prev.basicsLocked
            ? prev.country
            : e164.startsWith("+86")
            ? "CN"
            : e164.startsWith("+1")
            ? "US"
            : prev.country,
        nativeLang:
          prev.basicsLocked
            ? prev.nativeLang
            : e164.startsWith("+86") ||
              e164.startsWith("+852") ||
              e164.startsWith("+853") ||
              e164.startsWith("+886")
            ? "中文"
            : "English",
        learningLang:
          prev.basicsLocked
            ? prev.learningLang
            : e164.startsWith("+86")
            ? "English"
            : "中文",
        chineseVariants:
          prev.basicsLocked || prev.chineseVariants?.length
            ? prev.chineseVariants
            : e164.startsWith("+86")
            ? ["mandarin"]
            : [],
      }));
      return { ok: true, needProfile: !entry.profileComplete };
    }

    // —— Supabase Phone Auth ——
    const sb = getSupabaseBrowser();
    if (!sb) return { ok: false, error: "后端未配置" };

    const { data, error } = await sb.auth.verifyOtp({
      phone: e164,
      token: trimmed,
      type: "sms",
    });
    if (error) return { ok: false, error: error.message };
    const uid = data.user?.id;
    if (!uid) return { ok: false, error: "验证失败" };

    setUserId(uid);
    // Bind phone uniquely on profile (one phone → one row)
    try {
      await upsertMyProfile({ id: uid, phone_e164: e164 });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("phone_e164") || msg.includes("duplicate") || msg.includes("unique")) {
        return {
          ok: false,
          error: "该手机号已绑定其他账号，一个号码只能注册一个账号",
        };
      }
    }

    let needProfile = true;
    try {
      const raw = await fetchDbProfile(uid);
      if (raw) {
        setMyProfile((prev) => ({
          ...prev,
          ...dbToMyPartial(raw),
          phoneE164: e164,
        }));
        setTier(raw.verified ? "verified" : "light");
        needProfile = !(raw.name && raw.age);
      } else {
        setMyProfile((prev) => ({ ...prev, phoneE164: e164 }));
        setTier("light");
      }
    } catch {
      setMyProfile((prev) => ({ ...prev, phoneE164: e164 }));
      setTier("light");
    }
    return { ok: true, needProfile };
  };

  const signOut = async () => {
    const sb = getSupabaseBrowser();
    if (sb) await sb.auth.signOut();
    setUserId(null);
    setAuthEmail(null);
    setTier("guest");
    setIsBanned(false);
    setBanReason(null);
    // Clear local profile so Me doesn't keep the previous display name as a "guest"
    setMyProfile(defaultMyProfile);
    setRegisterOpen(false);
    setVerifyOpen(false);
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          tier: "guest",
          region,
          installed,
          theme,
          locale,
          myProfile: defaultMyProfile,
          userId: null,
        })
      );
    } catch {}
  };

  const setPhotoPrivacy = (p: PhotoPrivacy) =>
    updateMyProfile({ photoPrivacy: p });
  const toggleTheme = () =>
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  const reset = () => {
    setTier("guest");
    setInstalled(false);
    setMyProfile(defaultMyProfile);
    setRegisterOpen(false);
    setVerifyOpen(false);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  };

  const value = useMemo<AppState>(
    () => ({
      tier,
      region,
      installed,
      theme,
      locale,
      myProfile,
      configured: isSupabaseConfigured,
      userId,
      authEmail,
      registerOpen,
      registerStartStep,
      verifyOpen,
      pendingAction,
      pendingHelloId,
      openRegister,
      openVerify,
      closeModals,
      clearPendingHello,
      completeRegister,
      updateMyProfile,
      refreshTrustTier,
      emailAuth,
      signInWithOAuth,
      sendEmailOtp,
      verifyEmailOtp,
      linkEmail,
      sendPhoneOtp,
      verifyPhoneOtp,
      signOut,
      setInstalled,
      setRegion,
      setPhotoPrivacy,
      setTheme,
      setLocale,
      toggleTheme,
      notifyPrefs,
      setNotifyPrefs,
      applyUnreadBadge,
      reset,
      isBanned,
      banReason,
      refreshBanStatus,
    }),
    [
      tier,
      region,
      installed,
      theme,
      locale,
      myProfile,
      userId,
      authEmail,
      registerOpen,
      registerStartStep,
      verifyOpen,
      pendingAction,
      pendingHelloId,
      notifyPrefs,
      isBanned,
      banReason,
    ]
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
