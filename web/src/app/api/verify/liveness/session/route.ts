import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { clientIp, rateLimitAllow } from "@/lib/rateLimit";
import {
  isLivenessEnvConfigured,
  livenessRegion,
} from "@/lib/flashCheck";
import {
  createLivenessSession,
  mintLivenessClientCreds,
} from "@/lib/awsLiveness";

export async function POST(req: Request) {
  if (!isLivenessEnvConfigured()) {
    return NextResponse.json(
      { error: "Flash Check not configured", enabled: false },
      { status: 503 }
    );
  }

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
  const rl = rateLimitAllow(`liveness:u:${user.id}`, 8, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts", retryAfterSec: rl.retryAfterSec },
      { status: 429 }
    );
  }
  const rlIp = rateLimitAllow(`liveness:ip:${ip}`, 30, 60 * 60 * 1000);
  if (!rlIp.ok) {
    return NextResponse.json(
      { error: "Too many attempts", retryAfterSec: rlIp.retryAfterSec },
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

  const { data: profile } = await admin
    .from("profiles")
    .select("verified,banned_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.banned_at) {
    return NextResponse.json({ error: "Account banned" }, { status: 403 });
  }
  if (profile?.verified) {
    return NextResponse.json({ error: "Already verified" }, { status: 400 });
  }

  const { data: pending } = await admin
    .from("verification_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();
  // Allow re-run: supersede old pending so user can get an instant AWS result
  if (pending) {
    await admin
      .from("verification_requests")
      .update({
        status: "rejected",
        admin_note: "Superseded by new Flash Check attempt",
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", pending.id);
  }

  try {
    const [sessionId, credentials] = await Promise.all([
      createLivenessSession(),
      mintLivenessClientCreds(),
    ]);
    return NextResponse.json({
      sessionId,
      region: livenessRegion(),
      credentials,
    });
  } catch (e) {
    console.error("[liveness/session]", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Could not start Flash Check",
      },
      { status: 500 }
    );
  }
}
