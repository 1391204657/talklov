/**
 * Admin console access control.
 * Whitelist emails via ADMIN_EMAILS (comma-separated). Default: admin@talklov.com
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
