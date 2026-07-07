/** Emails blocked from the PM app (internal + portal). Case-insensitive. */
const BLOCKED_PM_EMAILS = new Set([
  "allen@hudsontable.com",
  "allen@hudsontable.com",
  "allen@thehudsontable.com",
]);

/** Catches Allen @ Hudson Table addresses even if the domain spelling varies. */
const BLOCKED_PM_EMAIL_PATTERNS = [
  /^allen@hudsontable\.com$/i,
  /^allen@thehudsontable\.com$/i,
  /^allen@hudsontable\.com$/i,
  /^allen@[a-z0-9.-]*hudson[a-z0-9.-]*table\.(com|ca)$/i,
];

export function isBlockedPmEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  const normalized = email.trim().toLowerCase();
  if (BLOCKED_PM_EMAILS.has(normalized)) return true;
  if (
    normalized.startsWith("allen@") &&
    normalized.includes("hudson") &&
    normalized.includes("table")
  ) {
    return true;
  }
  return BLOCKED_PM_EMAIL_PATTERNS.some((pattern) => pattern.test(normalized));
}
