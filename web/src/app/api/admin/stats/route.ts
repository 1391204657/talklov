import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminServer";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { admin } = gate.ctx;

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    profilesTotal,
    profiles24h,
    vipActive,
    founders,
    favoritesTotal,
    views24h,
    purchases7d,
    affiliates,
    openReports,
    pendingVerify,
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("plan", ["vip", "founder"]),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_founder", true),
    admin.from("favorites").select("id", { count: "exact", head: true }),
    admin
      .from("profile_views")
      .select("id", { count: "exact", head: true })
      .gte("last_viewed_at", since24h),
    admin
      .from("purchases")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since7d),
    admin.from("affiliates").select("id", { count: "exact", head: true }),
    admin
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    admin
      .from("verification_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  return NextResponse.json({
    profilesTotal: profilesTotal.count ?? 0,
    profiles24h: profiles24h.count ?? 0,
    vipActive: vipActive.count ?? 0,
    founders: founders.count ?? 0,
    favoritesTotal: favoritesTotal.count ?? 0,
    views24h: views24h.count ?? 0,
    purchases7d: purchases7d.count ?? 0,
    affiliates: affiliates.count ?? 0,
    openReports: openReports.error ? 0 : openReports.count ?? 0,
    pendingVerify: pendingVerify.error ? 0 : pendingVerify.count ?? 0,
  });
}
