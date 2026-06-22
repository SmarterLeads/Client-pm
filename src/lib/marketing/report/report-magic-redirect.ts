export const REPORT_MAGIC_NEXT_COOKIE = "report_magic_next";

/**
 * Validates in-app redirects for report magic-links (never trust arbitrary origins).
 * Only `/report/[slug]` (+ optional trailing path segments) passes.
 */
export function safeReportMagicPath(p: string | null | undefined): string | null {
  const v = p?.trim();
  if (!v || v.startsWith("//")) return null;
  if (!v.startsWith("/report/")) return null;
  if (v.includes("..")) return null;
  return v;
}
