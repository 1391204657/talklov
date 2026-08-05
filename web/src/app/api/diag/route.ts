import { NextResponse } from "next/server";
import { SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

/**
 * Public connectivity probe — same for every region.
 * CN users can open /diag to see whether talklov + supabase respond.
 */
export async function GET() {
  const started = Date.now();
  const out: Record<string, unknown> = {
    ok: true,
    at: new Date().toISOString(),
    supabaseConfigured: isSupabaseConfigured,
    supabaseHost: (() => {
      try {
        return SUPABASE_URL ? new URL(SUPABASE_URL).hostname : null;
      } catch {
        return null;
      }
    })(),
  };

  if (SUPABASE_URL) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
        signal: AbortSignal.timeout(8000),
      });
      out.supabaseAuth = {
        status: res.status,
        ms: Date.now() - t0,
        reachable: res.status > 0,
      };
    } catch (e) {
      out.supabaseAuth = {
        reachable: false,
        ms: Date.now() - t0,
        error: e instanceof Error ? e.message : "fetch failed",
      };
    }
  }

  out.serverMs = Date.now() - started;
  return NextResponse.json(out);
}
