import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  isSupabaseConfigured,
} from "./config";

/**
 * Service-role client for webhooks / admin updates.
 * Falls back to null when SUPABASE_SERVICE_ROLE_KEY is unset.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!isSupabaseConfigured || !SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export { SUPABASE_ANON_KEY };
