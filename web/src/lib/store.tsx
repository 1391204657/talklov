"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { Tier, PhotoPrivacy } from "./types";
import { isSupabaseConfigured } from "./supabase/config";
import { getSupabaseBrowser } from "./supabase/client";
import {
  fetchDbProfile,
  dbToMyPartial,
  myProfileToDbPatch,
  upsertMyProfile,
} from "./db";
import { defaultMyProfile, type MyProfile } from "./profile";
import {
  DEMO_OTP,
  dialMeta,
  type DialCode,
  isValidNational,
  toE164,
} from "./phone";
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
  registerOpen: boolean;
  verifyOpen: boolean;
  pendingAction: string | null;
  pendingHelloId: string | null;
  openRegister: (action?: string, helloId?: string) => void;
  openVerify: (action?: string) => void;
  closeModals: () => void;
  clearPendingHello: () => void;
  completeRegister: (p: Partial<MyProfile>) => void;
  updateMyProfile: (p: Partial<MyProfile>) => void;
  completeVerify: () => void;
  /** Optional legacy / future email bind */
  emailAuth: (
    mode: "signin" | "signup",
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
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
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [pendingHelloId, setPendingHelloId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [notifyPrefs, setNotifyPrefsState] = useState<NotifyPrefs>(defaultNotifyPrefs);
  const [hydrated, setHydrated] = useState(false);

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

    const applyUser = async (uid: string | null) => {
      // No Supabase session: keep offline/demo phone login from localStorage.
      // Only signOut() should clear tier — otherwise kill-app relaunches wipe login.
      if (!uid) return;

      setUserId(uid);
      try {
        const raw = await fetchDbProfile(uid);
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
            // Keep local phone if DB row has none
            phoneE164: fromDb.phoneE164 || prev.phoneE164 || "",
            voiceIntroUrl: prev.voiceIntroUrl || "",
          }));
          setTier(raw.verified ? "verified" : "light");
        } else {
          setTier((t) => (t === "guest" ? "light" : t));
        }
      } catch {
        setTier((t) => (t === "guest" ? "light" : t));
      }
    };

    sb.auth.getUser().then(({ data }) => applyUser(data.user?.id ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      // Ignore transient signed-out noise during token refresh; SIGNED_OUT is explicit
      if (event === "INITIAL_SESSION" && !session?.user) return;
      if (event === "SIGNED_OUT") {
        // Don't force guest here if local demo login exists — signOut() handles it
        return;
      }
      applyUser(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const openRegister = (action?: string, helloId?: string) => {
    setPendingAction(action ?? null);
    if (helloId) setPendingHelloId(helloId);
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

  const completeVerify = () => {
    setTier("verified");
    setVerifyOpen(false);
    if (isSupabaseConfigured && userId) {
      upsertMyProfile({ id: userId, verified: true, tier: "verified" }).catch(
        () => {}
      );
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
    if (data.user) setUserId(data.user.id);
    return { ok: true };
  };

  const sendPhoneOtp = async (
    dial: DialCode,
    national: string
  ): Promise<{ ok: boolean; error?: string; e164?: string; isNew?: boolean }> => {
    if (!isValidNational(dial, national)) {
      return { ok: false, error: "请输入正确的手机号" };
    }
    const e164 = toE164(dial, national);
    const meta = dialMeta(dial);
    setLocale(meta.locale);
    setRegion(meta.country === "CN" ? "CN" : "global");

    // Offline / demo path when SMS provider not ready
    const runDemo = () => {
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

    // Check uniqueness on profiles (defense in depth)
    let isNew = true;
    try {
      const { data: existing } = await sb
        .from("profiles")
        .select("id")
        .eq("phone_e164", e164)
        .maybeSingle();
      isNew = !existing;
    } catch {
      /* column may not exist until migration — continue */
    }

    const { error } = await sb.auth.signInWithOtp({ phone: e164 });
    if (error) {
      // Phone provider not configured yet → demo OTP so product flow stays testable
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
    if (!isSupabaseConfigured || demo) {
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
    setTier("guest");
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
      registerOpen,
      verifyOpen,
      pendingAction,
      pendingHelloId,
      openRegister,
      openVerify,
      closeModals,
      clearPendingHello,
      completeRegister,
      updateMyProfile,
      completeVerify,
      emailAuth,
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
    }),
    [
      tier,
      region,
      installed,
      theme,
      locale,
      myProfile,
      userId,
      registerOpen,
      verifyOpen,
      pendingAction,
      pendingHelloId,
      notifyPrefs,
    ]
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
