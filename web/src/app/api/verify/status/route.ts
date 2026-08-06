import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
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

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Service role not configured" },
      { status: 503 }
    );
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("verified")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.verified) {
    return NextResponse.json({
      verified: true,
      status: "approved" as const,
      request: null,
    });
  }

  const { data: latest } = await admin
    .from("verification_requests")
    .select("id,status,admin_note,created_at,reviewed_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    verified: false,
    status: (latest?.status as string) || null,
    request: latest
      ? {
          id: latest.id,
          status: latest.status,
          adminNote: latest.admin_note,
          createdAt: latest.created_at,
          reviewedAt: latest.reviewed_at,
        }
      : null,
  });
}
