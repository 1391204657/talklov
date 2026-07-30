import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { appUrl, getStripe, isStripeConfigured } from "@/lib/stripe";

export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe 未配置" }, { status: 503 });
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

  const admin = getSupabaseAdmin() || sb;
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const customerId = profile?.stripe_customer_id as string | undefined;
  if (!customerId) {
    return NextResponse.json(
      { error: "还没有账单账户，请先订阅一次" },
      { status: 400 }
    );
  }

  const base = appUrl().replace(/\/$/, "");
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${base}/me/membership`,
  });

  return NextResponse.json({ url: portal.url });
}
