import { CHANNEL_PLATFORM_FIELDS } from "@/lib/clients/overview-fields";

const AD_CONVERSION_CHANNEL_CONFIG = [
  { channel: "google_ads", platform: "google", label: "Google Ads" },
  { channel: "meta_ads", platform: "meta", label: "Meta Ads" },
  { channel: "microsoft_ads", platform: "microsoft", label: "Microsoft Ads" },
  { channel: "tiktok_ads", platform: "tiktok", label: "TikTok Ads" },
] as const;

/** Ad platforms that appear on the client Conversions tab. */
export const AD_CONVERSION_CHANNEL_FIELDS = AD_CONVERSION_CHANNEL_CONFIG.map(
  (row) => {
    const connection = CHANNEL_PLATFORM_FIELDS.find(
      (field) => field.channel === row.channel,
    );
    return connection ? { ...connection, label: row.label } : row;
  },
);

export type AdConversionChannel =
  (typeof AD_CONVERSION_CHANNEL_CONFIG)[number]["channel"];

export type AdConversionPlatform =
  (typeof AD_CONVERSION_CHANNEL_CONFIG)[number]["platform"];

const CHANNEL_TO_PLATFORM = new Map(
  AD_CONVERSION_CHANNEL_CONFIG.map((row) => [row.channel, row.platform]),
);

const PLATFORM_TO_SECTION_LABEL = new Map<string, string>(
  AD_CONVERSION_CHANNEL_CONFIG.map((row) => [row.platform, row.label]),
);

export function marketingChannelToConversionPlatform(
  channel: string,
): AdConversionPlatform | null {
  return (CHANNEL_TO_PLATFORM.get(channel as AdConversionChannel) ??
    null) as AdConversionPlatform | null;
}

export function conversionPlatformSectionLabel(platform: string): string {
  return PLATFORM_TO_SECTION_LABEL.get(platform) ?? platform;
}

export function activeAdConversionChannels(
  marketingChannels: string[] | null | undefined,
) {
  const active = new Set(marketingChannels ?? []);
  return AD_CONVERSION_CHANNEL_CONFIG.filter((row) => active.has(row.channel));
}

export function compareConversionGoals(
  a: { priority: string; sort_order: number; conversion_name: string },
  b: { priority: string; sort_order: number; conversion_name: string },
): number {
  const priorityRank = (priority: string) => (priority === "primary" ? 0 : 1);
  const rankDiff = priorityRank(a.priority) - priorityRank(b.priority);
  if (rankDiff !== 0) return rankDiff;
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.conversion_name.localeCompare(b.conversion_name, undefined, {
    sensitivity: "base",
  });
}
