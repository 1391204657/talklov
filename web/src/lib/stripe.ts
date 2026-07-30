import Stripe from "stripe";

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  // Let SDK pick its bundled API version
  return new Stripe(key);
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function stripePriceId(envKey: string): string | null {
  const v = process.env[envKey]?.trim();
  return v || null;
}

export function appUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return (vercel.startsWith("http") ? vercel : `https://${vercel}`).replace(
      /\/$/,
      ""
    );
  }
  return "http://localhost:3000";
}
