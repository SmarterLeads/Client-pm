export function formatMarketingCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatMarketingRoas(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "--";
  return value.toFixed(2);
}

export function formatMarketingNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPlatformLabel(platform: string) {
  const normalized = platform.trim();
  if (!normalized) return "Unknown";
  if (normalized.toLowerCase() === "google") return "Google";
  if (normalized.toLowerCase() === "meta") return "Meta";
  if (normalized.toLowerCase() === "tiktok") return "TikTok";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function weightedAverageRoas(
  rows: { spendCents: number; roas: number | null }[],
): number | null {
  let spendTotal = 0;
  let roasWeighted = 0;

  for (const row of rows) {
    if (row.spendCents <= 0 || row.roas == null) continue;
    spendTotal += row.spendCents;
    roasWeighted += row.roas * row.spendCents;
  }

  if (spendTotal <= 0) return null;
  return roasWeighted / spendTotal;
}
