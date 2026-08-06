import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  commissionCents,
  normalizeAffiliateCode,
} from "@/lib/affiliate";

type AffiliateRow = {
  id: string;
  code: string;
  user_id: string | null;
  first_bps: number;
  renew_bps: number;
  active: boolean;
};

export async function resolveAffiliate(
  code: string | null | undefined
): Promise<AffiliateRow | null> {
  const normalized = normalizeAffiliateCode(code);
  if (!normalized) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin
    .from("affiliates")
    .select("id,code,user_id,first_bps,renew_bps,active")
    .eq("code", normalized)
    .eq("active", true)
    .maybeSingle();
  return (data as AffiliateRow | null) || null;
}

/**
 * Record a commission once per Stripe session/invoice.
 * Skips self-referral and inactive codes.
 */
export async function recordAffiliateCommission(opts: {
  refCode: string | null | undefined;
  buyerUserId: string;
  kind: "first" | "renew";
  product: string;
  amountCents: number;
  currency: string;
  stripeSessionId?: string | null;
  stripeInvoiceId?: string | null;
  stripePaymentIntent?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  if (opts.amountCents <= 0) return;

  const affiliate = await resolveAffiliate(opts.refCode);
  if (!affiliate) return;
  if (affiliate.user_id && affiliate.user_id === opts.buyerUserId) {
    console.info("[affiliate] skip self-referral", affiliate.code);
    return;
  }

  const rateBps = opts.kind === "first" ? affiliate.first_bps : affiliate.renew_bps;
  const cents = commissionCents(opts.amountCents, rateBps);
  if (cents <= 0) return;

  const { error } = await admin.from("affiliate_commissions").insert({
    affiliate_id: affiliate.id,
    buyer_user_id: opts.buyerUserId,
    kind: opts.kind,
    product: opts.product,
    stripe_session_id: opts.stripeSessionId || null,
    stripe_invoice_id: opts.stripeInvoiceId || null,
    stripe_payment_intent: opts.stripePaymentIntent || null,
    amount_cents: opts.amountCents,
    currency: (opts.currency || "usd").toLowerCase(),
    commission_cents: cents,
    rate_bps: rateBps,
    status: "pending",
    meta: opts.meta || null,
  });

  // Unique violation = already recorded — fine
  if (error && !/duplicate|unique/i.test(error.message)) {
    console.error("[affiliate] insert commission", error);
  }
}

/** Sticky first-touch on profile if empty. */
export async function stickReferralOnProfile(
  userId: string,
  code: string | null | undefined
): Promise<string | null> {
  const normalized = normalizeAffiliateCode(code);
  if (!normalized) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const affiliate = await resolveAffiliate(normalized);
  if (!affiliate) return null;
  if (affiliate.user_id && affiliate.user_id === userId) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("referred_by_code")
    .eq("id", userId)
    .maybeSingle();

  const existing = (profile?.referred_by_code as string | null) || null;
  if (existing) return existing;

  await admin
    .from("profiles")
    .update({ referred_by_code: normalized })
    .eq("id", userId)
    .is("referred_by_code", null);

  return normalized;
}
