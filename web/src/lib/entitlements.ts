/**
 * Paid entitlements (VIP / Founder / Boost).
 * Independent from trust tier: guest | light | verified.
 */

export type PaidPlan = "free" | "vip" | "founder";

export type Entitlement = {
  plan: PaidPlan;
  planExpiresAt: string | null;
  isFounder: boolean;
  founderSlot: number | null;
  founderGrantedAt: string | null;
  founderLastActiveAt: string | null;
  /** Soft-freeze: inactive Founders lose VIP perks but keep grey badge. */
  founderFrozen: boolean;
  boostUntil: string | null;
  stripeCustomerId: string | null;
};

export const defaultEntitlement: Entitlement = {
  plan: "free",
  planExpiresAt: null,
  isFounder: false,
  founderSlot: null,
  founderGrantedAt: null,
  founderLastActiveAt: null,
  founderFrozen: false,
  boostUntil: null,
  stripeCustomerId: null,
};

/** Days of inactivity before Founder VIP soft-freezes (badge stays). */
export const FOUNDER_INACTIVE_DAYS = 90;

export function isFounderFrozen(lastActiveAt: string | null | undefined): boolean {
  if (!lastActiveAt) return false;
  const t = new Date(lastActiveAt).getTime();
  if (!Number.isFinite(t)) return false;
  const days = (Date.now() - t) / (1000 * 60 * 60 * 24);
  return days > FOUNDER_INACTIVE_DAYS;
}

export function hasActiveVip(e: Entitlement): boolean {
  if (e.plan === "founder" && e.isFounder && !e.founderFrozen) return true;
  if (e.plan === "vip") {
    if (!e.planExpiresAt) return true;
    return new Date(e.planExpiresAt).getTime() > Date.now();
  }
  return false;
}

export function hasActiveBoost(e: Entitlement): boolean {
  if (!e.boostUntil) return false;
  return new Date(e.boostUntil).getTime() > Date.now();
}

export type PriceRegion = "US" | "CN";

export type CatalogItem = {
  id: string;
  kind: "subscription" | "one_time";
  region: PriceRegion;
  /** Display */
  titleZh: string;
  titleEn: string;
  priceLabelZh: string;
  priceLabelEn: string;
  hintZh?: string;
  hintEn?: string;
  /** Stripe Price ID env key name (resolved server-side) */
  stripePriceEnv: string;
};

export const CATALOG: CatalogItem[] = [
  {
    id: "vip_month_us",
    kind: "subscription",
    region: "US",
    titleZh: "月卡 VIP",
    titleEn: "Monthly VIP",
    priceLabelZh: "$14.99 / 月",
    priceLabelEn: "$14.99 / mo",
    stripePriceEnv: "STRIPE_PRICE_VIP_MONTH_US",
  },
  {
    id: "vip_quarter_us",
    kind: "subscription",
    region: "US",
    titleZh: "季卡 VIP",
    titleEn: "3-Month VIP",
    priceLabelZh: "$29.99（约 $9.99/月）",
    priceLabelEn: "$29.99 (≈ $9.99/mo)",
    hintZh: "更省",
    hintEn: "Best value",
    stripePriceEnv: "STRIPE_PRICE_VIP_QUARTER_US",
  },
  {
    id: "vip_year_us",
    kind: "subscription",
    region: "US",
    titleZh: "年卡 VIP",
    titleEn: "Yearly VIP",
    priceLabelZh: "$79.99 / 年",
    priceLabelEn: "$79.99 / year",
    hintZh: "最划算",
    hintEn: "Save most",
    stripePriceEnv: "STRIPE_PRICE_VIP_YEAR_US",
  },
  {
    id: "boost_us",
    kind: "one_time",
    region: "US",
    titleZh: "强力曝光 30 分钟",
    titleEn: "Boost 30 min",
    priceLabelZh: "$2.99",
    priceLabelEn: "$2.99",
    stripePriceEnv: "STRIPE_PRICE_BOOST_US",
  },
  {
    id: "vip_month_cn",
    kind: "subscription",
    region: "CN",
    titleZh: "月卡 VIP",
    titleEn: "Monthly VIP",
    priceLabelZh: "¥48 / 月",
    priceLabelEn: "¥48 / mo",
    stripePriceEnv: "STRIPE_PRICE_VIP_MONTH_CN",
  },
  {
    id: "vip_intro_cn",
    kind: "subscription",
    region: "CN",
    titleZh: "首月尝鲜",
    titleEn: "First month intro",
    priceLabelZh: "¥19.9 首月",
    priceLabelEn: "¥19.9 first month",
    hintZh: "降低门槛",
    hintEn: "Try first",
    stripePriceEnv: "STRIPE_PRICE_VIP_INTRO_CN",
  },
  {
    id: "boost_cn",
    kind: "one_time",
    region: "CN",
    titleZh: "首页置顶 30 分钟",
    titleEn: "Boost 30 min",
    priceLabelZh: "¥12",
    priceLabelEn: "¥12",
    stripePriceEnv: "STRIPE_PRICE_BOOST_CN",
  },
  {
    id: "ai_cards_cn",
    kind: "one_time",
    region: "CN",
    titleZh: "AI 破冰卡 ×3",
    titleEn: "AI opener cards ×3",
    priceLabelZh: "¥6",
    priceLabelEn: "¥6",
    stripePriceEnv: "STRIPE_PRICE_AI_CARDS_CN",
  },
];

export function catalogForRegion(region: PriceRegion): CatalogItem[] {
  return CATALOG.filter((c) => c.region === region);
}

export function resolveRegion(
  country: string | null | undefined,
  locale: string
): PriceRegion {
  if (country === "CN") return "CN";
  if (country === "US") return "US";
  return locale === "zh" ? "CN" : "US";
}
