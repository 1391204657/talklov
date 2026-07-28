/**
 * Normalize what users often paste from the Supabase dashboard.
 * The client must get the project origin only, e.g. https://xxxx.supabase.co
 * — NOT https://xxxx.supabase.co/rest/v1 or /auth/v1 (those double the path
 * and cause "Invalid path specified in request URL" / PGRST125).
 */
function normalizeUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let u = raw.trim().replace(/^['"]|['"]$/g, "");
  // strip accidental path suffixes from dashboard "API URL / REST" copies
  u = u.replace(/\/+$/, "");
  u = u.replace(/\/(rest|auth|storage|functions|realtime)\/v1$/i, "");
  u = u.replace(/\/+$/, "");
  return u || undefined;
}

function normalizeKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const k = raw.trim().replace(/^['"]|['"]$/g, "");
  return k || undefined;
}

export const SUPABASE_URL = normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = normalizeKey(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// When keys are absent we fall back to the offline mock prototype,
// so the app keeps working before a Supabase project is wired up.
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
