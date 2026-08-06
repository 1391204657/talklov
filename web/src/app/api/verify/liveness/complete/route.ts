import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { clientIp, rateLimitAllow } from "@/lib/rateLimit";
import {
  isLivenessEnvConfigured,
  livenessAutoApproveScore,
  livenessMinScore,
} from "@/lib/flashCheck";
import { fetchLivenessResult } from "@/lib/awsLiveness";

export async function POST(req: NextRequest) {
  if (!isLivenessEnvConfigured()) {
    return NextResponse.json(
      { error: "Flash Check not configured" },
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

  const rl = rateLimitAllow(`liveness-done:u:${user.id}`, 12, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts", retryAfterSec: rl.retryAfterSec },
      { status: 429 }
    );
  }
  void clientIp(req);

  let body: { sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const sessionId = (body.sessionId || "").trim();
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
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
    return NextResponse.json({ ok: true, outcome: "already_verified" });
  }

  let result;
  try {
    result = await fetchLivenessResult(sessionId);
  } catch (e) {
    console.error("[liveness/complete]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Flash Check failed" },
      { status: 500 }
    );
  }

  const min = livenessMinScore();
  const auto = livenessAutoApproveScore();
  const score = result.confidence;

  if (result.status !== "SUCCEEDED" || score < min || !result.selfieDataUrl) {
    return NextResponse.json({
      ok: false,
      outcome: "failed",
      confidence: score,
      status: result.status,
    });
  }

  // Prevent reuse of the same AWS session
  const { data: existing } = await admin
    .from("verification_requests")
    .select("id")
    .eq("liveness_session_id", sessionId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({
      ok: true,
      outcome: "duplicate",
      confidence: score,
    });
  }

  const now = new Date().toISOString();
  const autoApprove = score >= auto;

  const { data: row, error } = await admin
    .from("verification_requests")
    .insert({
      user_id: user.id,
      selfie_data: result.selfieDataUrl,
      status: autoApprove ? "approved" : "pending",
      liveness_score: Math.round(score * 100) / 100,
      liveness_session_id: sessionId,
      liveness_provider: "aws_rekognition",
      reviewed_at: autoApprove ? now : null,
      admin_note: autoApprove
        ? `Auto-approved Flash Check score ${score.toFixed(1)}`
        : null,
      updated_at: now,
    })
    .select("id,status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (autoApprove) {
    const { error: pErr } = await admin
      .from("profiles")
      .update({
        verified: true,
        tier: "verified",
        updated_at: now,
      })
      .eq("id", user.id);
    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    outcome: autoApprove ? "approved" : "pending",
    confidence: score,
    requestId: row.id,
  });
}
