import { ChineseVariant, Intent, PhotoPrivacy, Gender } from "./types";

export type CountryCode = "US" | "CN" | "OTHER";

export interface MyProfile {
  name: string;
  gender: Gender;
  age: number | null;
  country: CountryCode;
  city: string;
  occupation: string;
  education: string;
  zodiac: string;
  bio: string;
  interests: string[];
  photos: string[]; // max 3 data-URLs or remote URLs
  nativeLang: string;
  learningLang: string;
  /** Learning language proficiency, e.g. 中级 Intermediate / HSK4 */
  level: string;
  /** E.164 phone, unique across accounts */
  phoneE164: string;
  chineseVariants: ChineseVariant[];
  intents: Intent[];
  photoPrivacy: PhotoPrivacy;
  /** Once set at onboarding, gender/age/country cannot change in UI. */
  basicsLocked: boolean;
  /** 5–10s self-intro / hello recording (local data URL until Storage is wired). */
  voiceIntroUrl: string;
}

export const defaultMyProfile: MyProfile = {
  name: "",
  gender: "male",
  age: null,
  country: "US",
  city: "",
  occupation: "",
  education: "",
  zodiac: "",
  bio: "",
  interests: [],
  photos: [],
  nativeLang: "English",
  learningLang: "中文",
  level: "",
  phoneE164: "",
  chineseVariants: [],
  intents: ["language"],
  photoPrivacy: "public",
  basicsLocked: false,
  voiceIntroUrl: "",
};

/** Fields that contribute to the completeness meter (verified is a bonus). */
const WEIGHTS: {
  key: keyof MyProfile | "verified";
  id: string;
  w: number;
}[] = [
  { key: "name", id: "name", w: 10 },
  { key: "gender", id: "gender", w: 5 },
  { key: "age", id: "age", w: 10 },
  { key: "country", id: "country", w: 5 },
  { key: "city", id: "city", w: 8 },
  { key: "photos", id: "photos", w: 15 },
  { key: "bio", id: "bio", w: 12 },
  { key: "voiceIntroUrl", id: "voice", w: 6 },
  { key: "interests", id: "interests", w: 10 },
  { key: "occupation", id: "occupation", w: 6 },
  { key: "education", id: "education", w: 4 },
  { key: "zodiac", id: "zodiac", w: 3 },
  { key: "intents", id: "intents", w: 6 },
  { key: "nativeLang", id: "nativeLang", w: 3 },
  { key: "learningLang", id: "learningLang", w: 3 },
  { key: "level", id: "level", w: 4 },
];

const COMPLETENESS_LABELS: Record<string, { zh: string; en: string }> = {
  name: { zh: "昵称", en: "Name" },
  gender: { zh: "性别", en: "Gender" },
  age: { zh: "年龄", en: "Age" },
  country: { zh: "国家", en: "Country" },
  city: { zh: "城市", en: "City" },
  photos: { zh: "照片", en: "Photos" },
  bio: { zh: "自我介绍", en: "Bio" },
  voice: { zh: "语音介绍", en: "Voice intro" },
  interests: { zh: "爱好", en: "Interests" },
  occupation: { zh: "职业", en: "Occupation" },
  education: { zh: "学历", en: "Education" },
  zodiac: { zh: "星座", en: "Zodiac" },
  intents: { zh: "意图", en: "Intents" },
  nativeLang: { zh: "母语", en: "Native language" },
  learningLang: { zh: "在学语言", en: "Learning" },
  level: { zh: "语言级别", en: "Level" },
  verified: { zh: "真人认证", en: "Verification" },
};

const VERIFIED_BONUS = 10;

function filled(p: MyProfile, key: keyof MyProfile): boolean {
  const v = p[key];
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return v > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export function completenessFieldLabel(
  id: string,
  locale: "zh" | "en" = "zh"
): string {
  const row = COMPLETENESS_LABELS[id];
  if (!row) return id;
  return locale === "en" ? row.en : row.zh;
}

export function profileCompleteness(
  p: MyProfile,
  verified = false,
  locale: "zh" | "en" = "zh"
): { percent: number; missing: string[]; total: number; earned: number } {
  let earned = 0;
  const missing: string[] = [];
  let total = 0;
  for (const item of WEIGHTS) {
    if (item.key === "verified") continue;
    total += item.w;
    if (filled(p, item.key as keyof MyProfile)) earned += item.w;
    else missing.push(completenessFieldLabel(item.id, locale));
  }
  total += VERIFIED_BONUS;
  if (verified) earned += VERIFIED_BONUS;
  else missing.push(completenessFieldLabel("verified", locale));

  const percent = Math.min(100, Math.round((earned / total) * 100));
  return { percent, missing, total, earned };
}

export const ZODIAC_OPTIONS = [
  "白羊座 Aries",
  "金牛座 Taurus",
  "双子座 Gemini",
  "巨蟹座 Cancer",
  "狮子座 Leo",
  "处女座 Virgo",
  "天秤座 Libra",
  "天蝎座 Scorpio",
  "射手座 Sagittarius",
  "摩羯座 Capricorn",
  "水瓶座 Aquarius",
  "双鱼座 Pisces",
];

export const EDUCATION_OPTIONS = [
  "高中 / High school",
  "大专 / College",
  "本科 / Bachelor",
  "硕士 / Master",
  "博士 / PhD",
  "其他 / Other",
];

export const INTEREST_SUGGESTIONS = [
  "旅行",
  "咖啡",
  "电影",
  "音乐",
  "健身",
  "美食",
  "摄影",
  "读书",
  "游戏",
  "徒步",
  "瑜伽",
  "宠物",
  "艺术",
  "科技",
  "篮球",
  "追剧",
];

export const MAX_PHOTOS = 3;

export const NATIVE_LANG_OPTIONS = ["中文", "English", "其他 Other"];

export const LEARNING_LANG_OPTIONS = ["English", "中文", "其他 Other"];

/** Levels for learning English / general. */
export const LEVEL_OPTIONS_EN = [
  "初级 Beginner",
  "中级 Intermediate",
  "高级 Advanced",
];

/** Levels when learning Chinese. */
export const LEVEL_OPTIONS_ZH = [
  "HSK1",
  "HSK2",
  "HSK3",
  "HSK4",
  "HSK5",
  "HSK6",
  "初级 Beginner",
  "中级 Intermediate",
  "高级 Advanced",
];

export function levelOptionsFor(learningLang: string): string[] {
  return learningLang === "中文" ? LEVEL_OPTIONS_ZH : LEVEL_OPTIONS_EN;
}

/** Short label for display, e.g. "中级 Intermediate" → "中级". */
export function shortLevel(level: string): string {
  if (!level) return "";
  const head = level.split(/\s+/)[0];
  return head || level;
}

export const VARIANT_LABEL: Record<ChineseVariant, string> = {
  mandarin: "普通话",
  cantonese: "粤语",
};

export function formatChineseVariants(
  variants?: ChineseVariant[] | null
): string {
  if (!variants?.length) return "";
  return variants.map((v) => VARIANT_LABEL[v]).join(" · ");
}

export function parseChineseVariants(
  raw: string | null | undefined
): ChineseVariant[] {
  if (!raw) return [];
  const parts = raw.split(/[,+/|]/).map((s) => s.trim().toLowerCase());
  const out: ChineseVariant[] = [];
  for (const p of parts) {
    if (p === "mandarin" || p === "普通话") out.push("mandarin");
    if (p === "cantonese" || p === "粤语" || p === "广东话") out.push("cantonese");
  }
  return [...new Set(out)];
}

export type UiLocale = "zh" | "en";
