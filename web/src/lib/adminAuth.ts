/**
 * Admin console access control.
 * Whitelist emails via ADMIN_EMAILS (comma-separated). Default: admin@talklov.com
 *
 * Staff-only ops accounts (STAFF_ONLY_EMAILS, default admin@talklov.com) can log into
 * /admin but must never appear in Discover or the admin "users" product list.
 */

export function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || "admin@talklov.com";
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

/** Ops / back-office accounts — not end-user profiles. */
export function staffOnlyEmails(): string[] {
  const raw = process.env.STAFF_ONLY_EMAILS || "admin@talklov.com";
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isStaffOnlyEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return staffOnlyEmails().includes(email.trim().toLowerCase());
}
