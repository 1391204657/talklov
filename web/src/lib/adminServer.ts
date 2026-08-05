import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/adminAuth";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminContext = {
  user: User;
  email: string;
  admin: SupabaseClient;
};

/** Require logged-in user whose email is in ADMIN_EMAILS. */
export async function requireAdmin(): Promise<
  { ok: true; ctx: AdminContext } | { ok: false; response: NextResponse }
> {
  const sb = await getSupabaseServer();
  if (!sb) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Supabase not configured" }, { status: 503 }),
    };
  }

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user?.email) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!isAdminEmail(user.email)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Service role not configured" },
        { status: 503 }
      ),
    };
  }

  return {
    ok: true,
    ctx: { user, email: user.email, admin },
  };
}
