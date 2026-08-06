import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { clientIp, rateLimitAllow } from "@/lib/rateLimit";

const MAX_CHARS = 700000;
const DATA_URL_RE = /^data:image\/(jpeg|jpg|png|webp);base64,/i;

export async function POST(req: NextRequest) {
  const sb = await getSupabaseServer();
  if (!sb) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIp(req);
  const rlUser = rateLimitAllow(`verify:u:${user.id}`, 5, 60 * 60 * 1000);
  if (!rlUser.ok) {
    return NextResponse.json(
      { error: "Too many submissions", retryAfterSec: rlUser.retryAfterSec },
      { status: 429 }
    );
  }
  const rlIp = rateLimitAllow(`verify:ip:${ip}`, 20, 60 * 60 * 1000);
  if (!rlIp.ok) {
    return NextResponse.json(
      { error: "Too many submissions", retryAfterSec: rlIp.retryAfterSec },
      { status: 429 }
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Service role not configured" },
      { status: 503 }
    );
  }

  let body: { selfieDataUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const selfie = (body.selfieDataUrl || "").trim();
  if (!DATA_URL_RE.test(selfie)) {
    return NextResponse.json(
      { error: "Need a JPEG/PNG/WebP data URL selfie" },
      { status: 400 }
    );
  }
  if (selfie.length > MAX_CHARS) {
    return NextResponse.json(
      { error: "Selfie too large — retake closer / lower quality" },
      { status: 400 }
    );
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id,verified,banned_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  if (profile.banned_at) {
    return NextResponse.json({ error: "Account banned" }, { status: 403 });
  }
  if (profile.verified) {
    return NextResponse.json({ error: "Already verified", status: "approved" }, { status: 400 });
  }

  const { data: pending } = await admin
    .from("verification_requests")
    .select("id,status,created_at")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (pending) {
    return NextResponse.json(
      {
        error: "Already pending review",
        status: "pending",
        id: pending.id,
      },
      { status: 409 }
    );
  }

  const { data: row, error } = await admin
    .from("verification_requests")
    .insert({
      user_id: user.id,
      selfie_data: selfie,
      status: "pending",
      liveness_provider: "manual_selfie",
    })
    .select("id,status,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, request: row });
}
