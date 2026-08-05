import type { SupabaseClient } from "@supabase/supabase-js";

export async function writeAdminAudit(
  admin: SupabaseClient,
  row: {
    adminUserId: string;
    adminEmail: string;
    action: string;
    targetUserId?: string | null;
    meta?: Record<string, unknown>;
  }
) {
  try {
    await admin.from("admin_audit_log").insert({
      admin_user_id: row.adminUserId,
      admin_email: row.adminEmail,
      action: row.action,
      target_user_id: row.targetUserId ?? null,
      meta: row.meta ?? {},
    });
  } catch (e) {
    console.warn("[admin_audit]", e);
  }
}
