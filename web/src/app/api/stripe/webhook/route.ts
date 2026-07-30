import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

/** Stripe SDK typings vary — read period end safely. */
function subPeriodEnd(sub: Stripe.Subscription): Date {
  const anySub = sub as unknown as {
    current_period_end?: number;
    items?: { data?: { current_period_end?: number }[] };
  };
  const ts =
    anySub.current_period_end ??
    anySub.items?.data?.[0]?.current_period_end ??
    Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
  return new Date(ts * 1000);
}

async function setVip(
  userId: string,
  expiresAt: Date | null,
  stripeCustomerId?: string
) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error("[stripe webhook] missing SUPABASE_SERVICE_ROLE_KEY");
    return;
  }
  const patch: Record<string, unknown> = {
    plan: "vip",
    plan_expires_at: expiresAt ? expiresAt.toISOString() : null,
  };
  if (stripeCustomerId) patch.stripe_customer_id = stripeCustomerId;
  // Don't overwrite founder plan
  const { data: row } = await admin
    .from("profiles")
    .select("is_founder,plan")
    .eq("id", userId)
    .maybeSingle();
  if (row?.is_founder || row?.plan === "founder") {
    await admin
      .from("profiles")
      .update(
        stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}
      )
      .eq("id", userId);
    return;
  }
  await admin.from("profiles").update(patch).eq("id", userId);
}

async function clearVip(userId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  const { data: row } = await admin
    .from("profiles")
    .select("is_founder")
    .eq("id", userId)
    .maybeSingle();
  if (row?.is_founder) return;
  await admin
    .from("profiles")
    .update({ plan: "free", plan_expires_at: null })
    .eq("id", userId);
}

async function applyBoost(userId: string, minutes = 30) {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  const until = new Date(Date.now() + minutes * 60_000).toISOString();
  await admin.from("profiles").update({ boost_until: until }).eq("id", userId);
  await admin.from("purchases").insert({
    user_id: userId,
    product: "boost_30m",
    status: "paid",
    meta: { minutes },
  });
}

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe 未配置" }, { status: 503 });
  }
  const stripe = getStripe()!;
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const raw = await req.text();
  let event: Stripe.Event;

  try {
    if (secret) {
      const sig = req.headers.get("stripe-signature") || "";
      event = stripe.webhooks.constructEvent(raw, sig, secret);
    } else {
      // Dev only — prefer signing secret in production
      event = JSON.parse(raw) as Stripe.Event;
    }
  } catch (e) {
    console.error("[stripe webhook] signature", e);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId =
          session.client_reference_id ||
          session.metadata?.supabase_user_id ||
          "";
        if (!userId) break;
        const catalogId = session.metadata?.catalog_id || "";
        if (session.mode === "subscription") {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id;
          let expires: Date | null = null;
          if (subId) {
            const sub = await stripe.subscriptions.retrieve(subId);
            expires = subPeriodEnd(sub);
            if (admin) {
              await admin.from("subscriptions").upsert(
                {
                  user_id: userId,
                  stripe_subscription_id: sub.id,
                  stripe_price_id:
                    typeof sub.items.data[0]?.price?.id === "string"
                      ? sub.items.data[0].price.id
                      : null,
                  status: sub.status === "trialing" ? "trialing" : "active",
                  plan: "vip",
                  current_period_end: expires.toISOString(),
                  cancel_at_period_end: sub.cancel_at_period_end,
                  raw: sub as unknown as Record<string, unknown>,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "stripe_subscription_id" }
              );
            }
          }
          await setVip(
            userId,
            expires,
            typeof session.customer === "string" ? session.customer : undefined
          );
        } else if (catalogId.includes("boost")) {
          await applyBoost(userId, 30);
        } else if (catalogId.includes("ai_cards") && admin) {
          await admin.from("purchases").insert({
            user_id: userId,
            product: "ai_cards_3",
            status: "paid",
            stripe_session_id: session.id,
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id || "";
        if (!userId) break;
        const active = ["active", "trialing"].includes(sub.status);
        const expires = subPeriodEnd(sub);
        if (admin) {
          await admin.from("subscriptions").upsert(
            {
              user_id: userId,
              stripe_subscription_id: sub.id,
              status: active
                ? sub.status === "trialing"
                  ? "trialing"
                  : "active"
                : sub.status === "past_due"
                  ? "past_due"
                  : "canceled",
              plan: "vip",
              current_period_end: expires.toISOString(),
              cancel_at_period_end: sub.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "stripe_subscription_id" }
          );
        }
        if (active) {
          await setVip(userId, expires);
        } else if (event.type === "customer.subscription.deleted") {
          await clearVip(userId);
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe webhook] handler", e);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
