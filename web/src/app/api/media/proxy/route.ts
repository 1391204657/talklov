import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_URL } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_HOST_SUFFIXES = [
  ".supabase.co",
  ".supabase.in",
  ".storage.googleapis.com",
];

function isAllowedUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase();
    const ok =
      ALLOWED_HOST_SUFFIXES.some((s) => host.endsWith(s)) ||
      (SUPABASE_URL
        ? host === new URL(SUPABASE_URL).hostname.toLowerCase()
        : false);
    return ok ? u : null;
  } catch {
    return null;
  }
}

/**
 * Proxy remote media (esp. Supabase Storage) through talklov.com.
 * Mainland CN often cannot load *.supabase.co images directly; US can.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("u") || "";
  const target = isAllowedUrl(raw);
  if (!target) {
    return NextResponse.json({ error: "Invalid media URL" }, { status: 400 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: { Accept: "image/*,*/*" },
      cache: "force-cache",
      next: { revalidate: 86400 },
    });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `Upstream ${upstream.status}` },
        { status: 502 }
      );
    }
    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.warn("[api/media/proxy]", e);
    return NextResponse.json({ error: "Proxy failed" }, { status: 502 });
  }
}
