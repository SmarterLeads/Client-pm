/**
 * Canonical `platform_connections.platform` values we document for Google Ads.
 */
export const GOOGLE_ADS_PLATFORM_DB_VALUES: string[] = [
  "google",
  "Google",
  "GOOGLE",
  "Google Ads",
  "google_ads",
];

function normalizePlatformKey(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/\u00a0/g, " ")
    .replace(/\ufeff/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * True when `platform` should be treated as Google Ads (spacing, case, small variants).
 */
export function isGoogleAdsPlatform(platform: string | null | undefined): boolean {
  const n = normalizePlatformKey(platform);
  if (!n) return false;

  const fromList = new Set(
    GOOGLE_ADS_PLATFORM_DB_VALUES.map((v) => normalizePlatformKey(v)),
  );
  if (fromList.has(n)) return true;

  const compact = n.replace(/[\s_-]/g, "");
  if (compact === "googleads" || compact === "googleadwords") return true;

  if (n === "google adwords" || n.startsWith("google adwords")) return true;
  if (n.startsWith("google ads")) return true;

  return false;
}

/**
 * True when `platform` is Microsoft Advertising (`platform_connections.platform`).
 */
export function isMicrosoftAdsPlatform(platform: string | null | undefined): boolean {
  const n = normalizePlatformKey(platform);
  if (!n) return false;
  if (n === "microsoft" || n === "bing" || n.startsWith("microsoft ads")) return true;
  const compact = n.replace(/[\s_-]/g, "");
  return compact === "microsoftadvertising" || compact === "microsoftads" || compact === "bingads";
}
