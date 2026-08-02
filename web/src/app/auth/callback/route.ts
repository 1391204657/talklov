import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

type EmailOtpType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email";

/**
 * OAuth / magic-link / email OTP return URL.
 * Exchanges ?code= (PKCE) or ?token_hash=&type= for a session cookie, then goes to the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextRaw = searchParams.get("next") || "/discover";
  const next = nextRaw.startsWith("/") ? nextRaw : "/discover";

  const sep = next.includes("?") ? "&" : "?";
  const successUrl = `${origin}${next}${sep}auth=1`;
  const errorUrl = `${origin}/discover?auth_error=1`;

  if (!isSupabaseConfigured || (!code && !(tokenHash && type))) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  let response = NextResponse.redirect(successUrl);

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  let errorMsg: string | null = null;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) errorMsg = error.message;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error) errorMsg = error.message;
  }

  if (errorMsg) {
    response = NextResponse.redirect(
      `${errorUrl}&msg=${encodeURIComponent(errorMsg)}`
    );
  }

  return response;
}
