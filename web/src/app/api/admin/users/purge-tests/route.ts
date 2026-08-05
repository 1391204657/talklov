import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminServer";
import { writeAdminAudit } from "@/lib/adminAudit";

/** Vince2 + Fibersea — note 4939761 (not 7939761). */
const DEFAULT_KEEP = ["4939761@qq.com", "2933363481@qq.com"];

/**
 * POST { keepEmails?: string[], confirm: "PURGE_TEST_USERS" }
 * Deletes Auth users not in keepEmails. Profiles cascade via FK.
 * Client-side mock personas are unaffected.
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { admin, user, email } = gate.ctx;

  let body: { keepEmails?: string[]; confirm?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (body.confirm !== "PURGE_TEST_USERS") {
    return NextResponse.json(
      { error: 'Send confirm: "PURGE_TEST_USERS"' },
      { status: 400 }
    );
  }

  const keep = new Set(
    (body.keepEmails?.length ? body.keepEmails : DEFAULT_KEEP).map((e) =>
      e.trim().toLowerCase()
    )
  );

  const all: { id: string; email?: string }[] = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const batch = data?.users || [];
    for (const u of batch) {
      all.push({ id: u.id, email: u.email || undefined });
    }
    if (batch.length < 200) break;
    page += 1;
  }

  const kept: string[] = [];
  const deleted: string[] = [];
  const failed: { email?: string; error: string }[] = [];

  for (const u of all) {
    const em = (u.email || "").trim().toLowerCase();
    if (em && keep.has(em)) {
      kept.push(em);
      continue;
    }
    // Never delete the currently signed-in admin
    if (u.id === user.id) {
      kept.push(em || u.id);
      continue;
    }
    const { error } = await admin.auth.admin.deleteUser(u.id);
    if (error) failed.push({ email: em || u.id, error: error.message });
    else deleted.push(em || u.id);
  }

  await writeAdminAudit(admin, {
    adminUserId: user.id,
    adminEmail: email,
    action: "purge_test_users",
    meta: { kept, deletedCount: deleted.length, failedCount: failed.length },
  });

  return NextResponse.json({
    ok: true,
    kept,
    deleted,
    failed,
    total: all.length,
  });
}
