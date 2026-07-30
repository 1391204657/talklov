import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { CATALOG } from "@/lib/entitlements";
import { appUrl, getStripe, isStripeConfigured, stripePriceId } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe 未配置：请设置 STRIPE_SECRET_KEY 与价格 ID" },
      { status: 503 }
    );
  }
  const stripe = getStripe()!;
  const sb = await getSupabaseServer();
  if (!sb) {
    return NextResponse.json({ error: "后端未配置" }, { status: 503 });
  }
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let catalogId: string;
  try {
    const body = await req.json();
    catalogId = String(body.catalogId || "");
  } catch {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }

  const item = CATALOG.find((c) => c.id === catalogId);
  if (!item) {
    return NextResponse.json({ error: "未知商品" }, { status: 400 });
  }
  const priceId = stripePriceId(item.stripePriceEnv);
  if (!priceId) {
    return NextResponse.json(
      {
        error: `未配置价格 ${item.stripePriceEnv}。请在 Stripe Dashboard 创建 Price 后写入环境变量。`,
      },
      { status: 503 }
    );
  }

  // Load / create Stripe customer
  const admin = getSupabaseAdmin() || sb;
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id,name")
    .eq("id", user.id)
    .maybeSingle();

  let customerId = (profile?.stripe_customer_id as string) || null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      name: (profile?.name as string) || undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await admin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const base = appUrl().replace(/\/$/, "");
  const mode = item.kind === "subscription" ? "subscription" : "payment";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/me/membership?success=1`,
    cancel_url: `${base}/me/membership?canceled=1`,
    client_reference_id: user.id,
    metadata: {
      supabase_user_id: user.id,
      catalog_id: item.id,
      product: item.id,
    },
    ...(mode === "subscription"
      ? {
          subscription_data: {
            metadata: {
              supabase_user_id: user.id,
              catalog_id: item.id,
            },
          },
        }
      : {}),
  });

  return NextResponse.json({ url: session.url });
}
