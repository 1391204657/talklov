"use client";

import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type BanStatus = {
  banned: boolean;
  banReason: string | null;
  bannedAt: string | null;
};

export async function fetchMyBanStatus(): Promise<BanStatus> {
  if (!isSupabaseConfigured) {
    return { banned: false, banReason: null, bannedAt: null };
  }
  const sb = getSupabaseBrowser();
  if (!sb) return { banned: false, banReason: null, bannedAt: null };
  const { data, error } = await sb.rpc("am_i_banned");
  if (error) {
    console.warn("[am_i_banned]", error.message);
    return { banned: false, banReason: null, bannedAt: null };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    banned: Boolean(row?.banned),
    banReason: (row?.ban_reason as string) || null,
    bannedAt: (row?.banned_at as string) || null,
  };
}

export type ReportReason =
  | "spam"
  | "harassment"
  | "scam"
  | "sexual"
  | "underage"
  | "fake"
  | "other";

export async function submitReport(input: {
  targetId: string;
  reason: ReportReason;
  details?: string;
  conversationId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabaseBrowser();
  if (!sb) return { ok: false, error: "Not configured" };
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in" };

  const { error } = await sb.from("reports").insert({
    reporter_id: user.id,
    target_id: input.targetId,
    reason: input.reason,
    details: input.details?.trim() || null,
    conversation_id: input.conversationId || null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
