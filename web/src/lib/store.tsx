"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
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
  friendlyAuthError,
  isValidEmail,
  type OAuthProvider,
} from "./authHelpers";
import {
  emailsMatch,
  getLastAuthEmail,
  isSessionLocked,
  setLastAuthEmail,
  setSessionLocked,
} from "./rememberedAuth";
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
  /** Soft-locked session on this device — one-tap resume without OTP. */
  canQuickResume: boolean;
  resumeEmail: string | null;
  lastAuthEmail: string | null;
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
  /** Password email sign-in (legacy accounts); prefer OTP / OAuth for new users. */
  emailAuth: (
    mode: "signin" | "signup",
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string; needProfile?: boolean }>;
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
  /** Soft logout: UI guest, keep session for one-tap resume on this device. */
  signOut: () => Promise<void>;
  /** Hard logout: revoke local session (still remembers last email for prefill). */
  signOutFull: () => Promise<void>;
  /** Resume soft-locked session without OTP/password. */
  resumeSession: () => Promise<{ ok: boolean; error?: string; needProfile?: boolean }>;
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

/** Prefer same-origin API (CN-safe); fall back to direct upsert. */
async function persistProfile(
  uid: string | null,
  p: Partial<MyProfile>
): Promise<{ photos?: string[] } | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const res = await fetch("/api/profile/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(p),
      cache: "no-store",
    });
    if (res.ok) {
      const json = (await res.json()) as { photos?: string[] };
      return { photos: json.photos };
    }
  } catch (e) {
    console.warn("[persistProfile] API", e);
  }
  if (!uid) return null;
  try {
    await upsertMyProfile(myProfileToDbPatch(uid, p));
    return null;
  } catch (e) {
    console.warn("[persistProfile] direct", e);
    return null;
  }
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
  const [canQuickResume, setCanQuickResume] = useState(false);
  const [resumeEmail, setResumeEmail] = useState<string | null>(null);
  const [lastAuthEmail, setLastAuthEmailState] = useState<string | null>(null);
  const [notifyPrefs, setNotifyPrefsState] = useState<NotifyPrefs>(defaultNotifyPrefs);
  const [hydrated, setHydrated] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const registerOpenRef = useRef(false);
  registerOpenRef.current = registerOpen;
  const myProfileRef = useRef(myProfile);
  myProfileRef.current = myProfile;
  const applyUserRef = useRef<
    ((uid: string | null, email?: string | null) => Promise<boolean>) | null
  >(null);

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
      // Promo links: ?lang=zh|en (or ?locale=) override saved UI language for this visit.
      const q = new URLSearchParams(window.location.search);
      const lang = (q.get("lang") || q.get("locale") || "").trim().toLowerCase();
      if (lang === "en" || lang === "zh") {
        setLocale(lang);
        if (lang === "en") setRegion("global");
        if (lang === "zh") setRegion("CN");
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

  const applyUnreadBadge = useCallback((count: number) => {
    void setAppBadgeCount(count, notifyPrefs.badge);
  }, [notifyPrefs.badge]);

  useEffect(() => {
    setLastAuthEmailState(getLastAuthEmail());
  }, []);

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

      // Soft-locked: keep session on device but stay guest in UI.
      if (isSessionLocked()) {
        const remembered = email || getLastAuthEmail();
        if (email) setLastAuthEmail(email);
        setLastAuthEmailState(getLastAuthEmail());
        setResumeEmail(remembered);
        setCanQuickResume(true);
        return false;
      }

      setUserId(uid);
      if (email !== undefined) {
        setAuthEmail(email || null);
        if (email) {
          setLastAuthEmail(email);
          setLastAuthEmailState(email.trim().toLowerCase());
        }
      }
      setCanQuickResume(false);
      setResumeEmail(null);
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
          const prev = myProfileRef.current;
          const localPhotos = prev.photos?.length ? prev.photos : [];
          const dbPhotos = fromDb.photos?.length ? fromDb.photos : [];
          const photos = dbPhotos.length ? dbPhotos : localPhotos;
          const name =
            (fromDb.name || "").trim() || (prev.name || "").trim() || "";
          const age = fromDb.age ?? prev.age;
          const merged = {
            ...prev,
            ...fromDb,
            name,
            age,
            photos,
            phoneE164:
              secrets.phoneE164 || fromDb.phoneE164 || prev.phoneE164 || "",
            voiceIntroUrl: prev.voiceIntroUrl || "",
            // Keep lock if either side already completed basics
            basicsLocked:
              prev.basicsLocked ||
              (!profileNeedsBasics(fromDb.name, fromDb.age) &&
                !!fromDb.gender &&
                !!fromDb.country),
          };
          // Local had filled profile but DB still empty (CN direct upsert often fails)
          const shouldPush =
            (!!(prev.name || "").trim() && !(fromDb.name || "").trim()) ||
            (localPhotos.length > 0 && dbPhotos.length === 0) ||
            (prev.basicsLocked &&
              profileNeedsBasics(raw.name || "", raw.age));
          if (shouldPush) {
            void persistProfile(uid, merged);
          }
          setMyProfile(merged);
          setTier(raw.verified ? "verified" : "light");
          const ban = await fetchMyBanStatus();
          setIsBanned(ban.banned);
          setBanReason(ban.banReason);
          // Same Google/email account: don't force onboarding again if this
          // device already has name+age (even when DB sync lagged).
          return profileNeedsBasics(name, age);
        }
        // No DB row yet — still skip wizard if this device already completed basics.
        const prev = myProfileRef.current;
        if (!profileNeedsBasics(prev.name, prev.age)) {
          void persistProfile(uid, { ...prev, basicsLocked: true });
          setTier((t) => (t === "guest" ? "light" : t));
          setIsBanned(false);
          setBanReason(null);
          return false;
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

    // Expose apply for resumeSession via ref
    applyUserRef.current = applyUser;

    const finishOAuthLanding = (needProfile: boolean, event: string) => {
      // Never open the consumer onboarding sheet on /admin (refresh was popping profile form).
      const onAdmin =
        typeof window !== "undefined" &&
        window.location.pathname.startsWith("/admin");
      // Only auto-open once per browser tab after a real sign-in — not on every refresh.
      // A sticky full-screen sheet can block Discover clicks on some CN WebViews.
      let alreadyPrompted = false;
      try {
        alreadyPrompted =
          sessionStorage.getItem("talklov_profile_prompted_v1") === "1";
      } catch {
        /* ignore */
      }
      const isFreshSignIn = event === "SIGNED_IN" || event === "USER_UPDATED";
      const authLanding =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("auth") === "1";
      if (
        needProfile &&
        !onAdmin &&
        !alreadyPrompted &&
        (isFreshSignIn || authLanding) &&
        !registerOpenRef.current
      ) {
        try {
          sessionStorage.setItem("talklov_profile_prompted_v1", "1");
        } catch {
          /* ignore */
        }
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

    // Prefer getSession (local) then getUser — more reliable when Auth API is slow (e.g. CN).
    void (async () => {
      const { data: sess } = await sb.auth.getSession();
      let uid = sess.session?.user?.id ?? null;
      let email = sess.session?.user?.email ?? null;
      if (!uid) {
        const { data } = await sb.auth.getUser();
        uid = data.user?.id ?? null;
        email = data.user?.email ?? null;
      }

      if (isSessionLocked() && uid) {
        if (email) setLastAuthEmail(email);
        setLastAuthEmailState(getLastAuthEmail());
        setResumeEmail(email || getLastAuthEmail());
        setCanQuickResume(true);
        return;
      }

      if (uid) {
        // Ensure tier is never stuck at guest once a session exists
        setTier((t) => (t === "guest" ? "light" : t));
        setUserId(uid);
        if (email) setAuthEmail(email);
      }
      const need = await applyUser(uid, email);
      if (
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("auth") === "1"
      ) {
        finishOAuthLanding(need, "INITIAL_SESSION");
      }
    })();
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      // Ignore transient signed-out noise during token refresh; SIGNED_OUT is explicit
      if (event === "INITIAL_SESSION" && !session?.user) return;
      if (event === "SIGNED_OUT") {
        // Don't force guest here if local demo login exists — signOut() handles it
        setAuthEmail(null);
        setCanQuickResume(false);
        setResumeEmail(null);
        setSessionLocked(false);
        return;
      }
      if (isSessionLocked() && session?.user) {
        const em = session.user.email || getLastAuthEmail();
        if (session.user.email) setLastAuthEmail(session.user.email);
        setLastAuthEmailState(getLastAuthEmail());
        setResumeEmail(em);
        setCanQuickResume(true);
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
      void persistProfile(userId, next).then((synced) => {
        if (synced?.photos?.length) {
          setMyProfile((cur) => ({ ...cur, photos: synced.photos! }));
        }
      });
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
      void persistProfile(userId, next).then((synced) => {
        if (synced?.photos?.length) {
          setMyProfile((cur) => ({ ...cur, photos: synced.photos! }));
        }
      });
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
  ): Promise<{ ok: boolean; error?: string; needProfile?: boolean }> => {
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      return {
        ok: false,
        error: locale === "en" ? "Enter a valid email" : "请输入正确的邮箱",
      };
    }
    if (!password || password.length < 6) {
      return {
        ok: false,
        error:
          locale === "en"
            ? "Enter your password (at least 6 characters)"
            : "请输入密码（至少 6 位）",
      };
    }
    const sb = getSupabaseBrowser();
    if (!sb) return { ok: false, error: locale === "en" ? "Backend not configured" : "后端未配置" };
    const { data, error } =
      mode === "signup"
        ? await sb.auth.signUp({ email: trimmed, password })
        : await sb.auth.signInWithPassword({ email: trimmed, password });
    if (error) {
      return { ok: false, error: friendlyAuthError(error.message, locale) };
    }
    const uid = data.user?.id;
    if (!uid) {
      return {
        ok: false,
        error:
          locale === "en"
            ? "Check your email to confirm the account"
            : "请查收邮件确认账号后再登录",
      };
    }
    setUserId(uid);
    setAuthEmail(data.user?.email ?? trimmed);
    setTier("light");
    setLastAuthEmail(trimmed);
    setLastAuthEmailState(trimmed);
    setSessionLocked(false);
    setCanQuickResume(false);
    setResumeEmail(null);

    let needProfile = true;
    try {
      const raw = await fetchDbProfile(uid);
      if (raw) {
        const fromDb = dbToMyPartial(raw);
        const prev = myProfileRef.current;
        const name =
          (fromDb.name || "").trim() || (prev.name || "").trim() || "";
        const age = fromDb.age ?? prev.age;
        setMyProfile({ ...prev, ...fromDb, name, age });
        setTier(raw.verified ? "verified" : "light");
        needProfile = profileNeedsBasics(name, age);
        if (needProfile === false && profileNeedsBasics(raw.name, raw.age)) {
          void persistProfile(uid, { ...prev, ...fromDb, name, age });
        }
      } else if (
        !profileNeedsBasics(myProfileRef.current.name, myProfileRef.current.age)
      ) {
        needProfile = false;
        void persistProfile(uid, myProfileRef.current);
      }
    } catch {
      /* new user */
    }
    return { ok: true, needProfile };
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
    if (error) {
      return { ok: false, error: friendlyAuthError(error.message, locale) };
    }
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
      return { ok: false, error: friendlyAuthError(error.message, locale) };
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
    if (error) {
      return { ok: false, error: friendlyAuthError(error.message, locale) };
    }
    const uid = data.user?.id;
    if (!uid) return { ok: false, error: locale === "en" ? "Verification failed" : "验证失败" };

    setUserId(uid);
    setAuthEmail(data.user?.email ?? trimmed);
    setTier("light");
    setLastAuthEmail(trimmed);
    setLastAuthEmailState(trimmed);
    setSessionLocked(false);
    setCanQuickResume(false);
    setResumeEmail(null);

    let needProfile = true;
    try {
      const raw = await fetchDbProfile(uid);
      if (raw) {
        const fromDb = dbToMyPartial(raw);
        const prev = myProfileRef.current;
        const name =
          (fromDb.name || "").trim() || (prev.name || "").trim() || "";
        const age = fromDb.age ?? prev.age;
        setMyProfile({ ...prev, ...fromDb, name, age });
        setTier(raw.verified ? "verified" : "light");
        needProfile = profileNeedsBasics(name, age);
        if (needProfile === false && profileNeedsBasics(raw.name, raw.age)) {
          void persistProfile(uid, { ...prev, ...fromDb, name, age });
        }
      } else if (!profileNeedsBasics(myProfileRef.current.name, myProfileRef.current.age)) {
        needProfile = false;
        void persistProfile(uid, myProfileRef.current);
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

    const smsNotConfiguredError = () =>
      locale === "en"
        ? "SMS is not configured. Connect Twilio in Supabase Auth → Phone, or set NEXT_PUBLIC_ALLOW_DEMO_OTP=1 for testing."
        : "短信未配置。请在 Supabase Auth → Phone 接入 Twilio，或设置 NEXT_PUBLIC_ALLOW_DEMO_OTP=1 用于测试。";

    const smsDeliveryHint = () =>
      dial === "+86"
        ? locale === "en"
          ? "Could not send SMS to this China number. Please use email code instead."
          : "该大陆号码短信发送失败，请改用邮箱验证码登录。"
        : locale === "en"
          ? "Could not send SMS. Check the number or try again later."
          : "短信发送失败，请检查号码或稍后再试。";

    const runDemo = () => {
      if (!allowDemoOtp()) {
        return {
          ok: false as const,
          error: smsNotConfiguredError(),
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
      const providerIssue =
        msg.includes("phone") ||
        msg.includes("sms") ||
        msg.includes("provider") ||
        msg.includes("disabled") ||
        msg.includes("twilio");
      // Dev/demo only: fall back to local OTP. Production: show a clear error.
      if (providerIssue && allowDemoOtp()) {
        return runDemo();
      }
      if (providerIssue) {
        return { ok: false, error: smsDeliveryHint() };
      }
      return { ok: false, error: friendlyAuthError(error.message, locale) };
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
    if (error) {
      return { ok: false, error: friendlyAuthError(error.message, locale) };
    }
    const uid = data.user?.id;
    if (!uid) {
      return { ok: false, error: locale === "en" ? "Verification failed" : "验证失败" };
    }

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
        const fromDb = dbToMyPartial(raw);
        const prev = myProfileRef.current;
        const name =
          (fromDb.name || "").trim() || (prev.name || "").trim() || "";
        const age = fromDb.age ?? prev.age;
        setMyProfile({
          ...prev,
          ...fromDb,
          name,
          age,
          phoneE164: e164,
        });
        setTier(raw.verified ? "verified" : "light");
        needProfile = profileNeedsBasics(name, age);
        if (!needProfile && profileNeedsBasics(raw.name, raw.age)) {
          void persistProfile(uid, {
            ...prev,
            ...fromDb,
            name,
            age,
            phoneE164: e164,
          });
        }
      } else {
        const prev = myProfileRef.current;
        setMyProfile({ ...prev, phoneE164: e164 });
        setTier("light");
        if (!profileNeedsBasics(prev.name, prev.age)) {
          needProfile = false;
          void persistProfile(uid, { ...prev, phoneE164: e164, basicsLocked: true });
        }
      }
    } catch {
      setMyProfile((prev) => ({ ...prev, phoneE164: e164 }));
      setTier("light");
    }
    return { ok: true, needProfile };
  };

  const clearUiToGuest = () => {
    setUserId(null);
    setAuthEmail(null);
    setTier("guest");
    setIsBanned(false);
    setBanReason(null);
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

  /** Soft logout — keep session for one-tap resume on this device. */
  const signOut = async () => {
    const sb = getSupabaseBrowser();
    let email = authEmail || getLastAuthEmail();
    if (sb) {
      const { data } = await sb.auth.getSession();
      email = data.session?.user?.email || email;
    }
    if (email) {
      setLastAuthEmail(email);
      setLastAuthEmailState(email.trim().toLowerCase());
      setResumeEmail(email.trim().toLowerCase());
    }
    setSessionLocked(true);
    setCanQuickResume(Boolean(email));
    clearUiToGuest();
  };

  /** Hard logout — clear device session; still remember last email for prefill. */
  const signOutFull = async () => {
    const email = authEmail || resumeEmail || getLastAuthEmail();
    if (email) {
      setLastAuthEmail(email);
      setLastAuthEmailState(email.trim().toLowerCase());
    }
    setSessionLocked(false);
    setCanQuickResume(false);
    setResumeEmail(null);
    const sb = getSupabaseBrowser();
    if (sb) await sb.auth.signOut();
    clearUiToGuest();
  };

  const resumeSession = async (): Promise<{
    ok: boolean;
    error?: string;
    needProfile?: boolean;
  }> => {
    const sb = getSupabaseBrowser();
    if (!sb || !isSupabaseConfigured) {
      return {
        ok: false,
        error: locale === "en" ? "Backend not configured" : "后端未配置",
      };
    }
    const { data } = await sb.auth.getSession();
    const user = data.session?.user;
    if (!user?.id) {
      setSessionLocked(false);
      setCanQuickResume(false);
      setResumeEmail(null);
      return {
        ok: false,
        error:
          locale === "en"
            ? "Session expired — please use email code"
            : "登录已过期，请用验证码重新登录",
      };
    }
    setSessionLocked(false);
    setCanQuickResume(false);
    setResumeEmail(null);
    if (user.email) {
      setLastAuthEmail(user.email);
      setLastAuthEmailState(user.email.trim().toLowerCase());
    }
    const apply = applyUserRef.current;
    const needProfile = apply
      ? await apply(user.id, user.email ?? null)
      : false;
    return { ok: true, needProfile };
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
    setCanQuickResume(false);
    setResumeEmail(null);
    setSessionLocked(false);
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
      canQuickResume,
      resumeEmail,
      lastAuthEmail,
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
      signOutFull,
      resumeSession,
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
      canQuickResume,
      resumeEmail,
      lastAuthEmail,
      registerOpen,
      registerStartStep,
      verifyOpen,
      pendingAction,
      pendingHelloId,
      notifyPrefs,
      isBanned,
      banReason,
      applyUnreadBadge,
    ]
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
