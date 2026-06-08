export const OVERVIEW_CLIENT_TYPES = [
  { value: "ecommerce", label: "E-commerce" },
  { value: "lead_generation", label: "Lead Generation" },
] as const;

export type OverviewClientType = (typeof OVERVIEW_CLIENT_TYPES)[number]["value"];

export const MARKETING_CHANNEL_OPTIONS = [
  { value: "google_ads", label: "Google Ads" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "microsoft_ads", label: "Microsoft Ads" },
  { value: "tiktok_ads", label: "TikTok Ads" },
  { value: "seo", label: "SEO" },
  { value: "linkedin_ads", label: "LinkedIn Ads" },
  { value: "website_maintenance", label: "Website Maintenance" },
  { value: "ga4", label: "GA4" },
] as const;

export const MARKETING_CHANNEL_VALUES = [
  "google_ads",
  "meta_ads",
  "microsoft_ads",
  "tiktok_ads",
  "seo",
  "linkedin_ads",
  "website_maintenance",
  "ga4",
] as const;

export type MarketingChannel = (typeof MARKETING_CHANNEL_OPTIONS)[number]["value"];

export const TRACKING_SETUP_OPTIONS = [
  { value: "whatconverts", label: "WhatConverts" },
  { value: "ghl", label: "Go High Level" },
  { value: "direct", label: "Direct" },
] as const;

export type TrackingSetup = (typeof TRACKING_SETUP_OPTIONS)[number]["value"];

export const CHANNEL_PLATFORM_FIELDS = [
  { channel: "google_ads", platform: "google", label: "Google Ads ID" },
  { channel: "meta_ads", platform: "meta", label: "Meta Ads ID" },
  {
    channel: "microsoft_ads",
    platform: "microsoft",
    label: "Microsoft Ads ID",
  },
  { channel: "tiktok_ads", platform: "tiktok", label: "TikTok Ads ID" },
  { channel: "linkedin_ads", platform: "linkedin", label: "LinkedIn Ads ID" },
] as const;

export const TRACKING_PLATFORM_FIELDS = [
  {
    setup: "whatconverts" as const,
    platform: "whatconverts",
    label: "WhatConverts ID",
  },
  { setup: "ghl" as const, platform: "ghl", label: "GHL ID" },
] as const;

export function normalizeOverviewClientType(
  value: string | null | undefined,
): OverviewClientType {
  if (value === "ecommerce") return "ecommerce";
  if (value === "lead_generation" || value === "lead_gen") return "lead_generation";
  return "lead_generation";
}

export function formatClientAddress(client: {
  address_street: string | null;
  address_city: string | null;
  address_province: string | null;
  address_postal_code: string | null;
  address_country: string | null;
}): string | null {
  const lines: string[] = [];
  if (client.address_street?.trim()) lines.push(client.address_street.trim());

  const cityLine = [
    client.address_city?.trim(),
    client.address_province?.trim(),
    client.address_postal_code?.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  if (cityLine) lines.push(cityLine);

  const country = client.address_country?.trim() || "Canada";
  if (country) lines.push(country);

  return lines.length > 0 ? lines.join("\n") : null;
}

export const CLIENT_CURRENCY_OPTIONS = [
  { value: "CAD", label: "CAD" },
  { value: "USD", label: "USD" },
] as const;

export type ClientCurrency = (typeof CLIENT_CURRENCY_OPTIONS)[number]["value"];

export function normalizeClientCurrency(
  value: string | null | undefined,
): ClientCurrency {
  return value === "USD" ? "USD" : "CAD";
}

export function formatMrr(
  cents: number | null | undefined,
  currency: ClientCurrency = "CAD",
): string {
  if (cents == null) return "—";
  const formatted = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
  return currency === "USD" ? `${formatted} USD` : formatted;
}

/** Overview status labels (maps to public.clients.status string values). */
export const OVERVIEW_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "prospect", label: "Lead" },
  { value: "on_hold", label: "Paused" },
  { value: "churned", label: "Churned" },
] as const;

export type OverviewStatus = (typeof OVERVIEW_STATUS_OPTIONS)[number]["value"];

export function normalizeOverviewStatus(
  value: string | null | undefined,
): OverviewStatus {
  if (value === "active") return "active";
  if (value === "on_hold") return "on_hold";
  if (value === "churned") return "churned";
  return "prospect";
}

export function isAddressComplete(client: {
  address_street: string | null;
  address_city: string | null;
  address_province: string | null;
  address_postal_code: string | null;
  address_country: string | null;
}): boolean {
  return Boolean(
    client.address_street?.trim() &&
      client.address_city?.trim() &&
      client.address_province?.trim() &&
      client.address_postal_code?.trim() &&
      (client.address_country?.trim() || "Canada"),
  );
}

export type PlatformIdRowConfig = {
  platform: string;
  label: string;
  channel?: MarketingChannel;
  trackingSetup?: TrackingSetup;
  alwaysShow?: boolean;
  clientField?: "ga4_id";
};

export const PLATFORM_ID_ROWS: PlatformIdRowConfig[] = [
  {
    channel: "google_ads",
    platform: "google",
    label: "Google Ads ID",
  },
  { channel: "meta_ads", platform: "meta", label: "Meta Ads ID" },
  {
    channel: "microsoft_ads",
    platform: "microsoft",
    label: "Microsoft Ads ID",
  },
  { channel: "tiktok_ads", platform: "tiktok", label: "TikTok Ads ID" },
  {
    channel: "linkedin_ads",
    platform: "linkedin",
    label: "LinkedIn Ads ID",
  },
  {
    platform: "whatconverts",
    label: "WhatConverts ID",
    trackingSetup: "whatconverts",
  },
  { platform: "ghl", label: "GHL ID", alwaysShow: true },
  { channel: "ga4", platform: "ga4", label: "GA4 ID", clientField: "ga4_id" },
];

export function getMarketingChannelLabel(value: string): string {
  return (
    MARKETING_CHANNEL_OPTIONS.find((option) => option.value === value)?.label ??
    value
  );
}

export function getTrackingSetupLabel(value: string | null | undefined): string {
  if (!value?.trim()) return "Not set";
  return (
    TRACKING_SETUP_OPTIONS.find((option) => option.value === value)?.label ??
    value
  );
}

/** Marketing channels that do not have an associated platform account ID. */
export const MARKETING_CHANNELS_WITHOUT_PLATFORM_ID = new Set<
  MarketingChannel
>(["seo", "website_maintenance"]);

export type ChannelPlatformIdConfig = {
  platform: string;
  clientField?: "ga4_id";
};

export function platformIdConfigForChannel(
  channel: MarketingChannel,
): ChannelPlatformIdConfig | null {
  if (MARKETING_CHANNELS_WITHOUT_PLATFORM_ID.has(channel)) return null;
  if (channel === "ga4") return { platform: "ga4", clientField: "ga4_id" };
  const row = CHANNEL_PLATFORM_FIELDS.find((field) => field.channel === channel);
  return row ? { platform: row.platform } : null;
}

export function trackingPlatformIdRows(
  trackingSetup: string | null | undefined,
): PlatformIdRowConfig[] {
  if (!trackingSetup) return [];
  return PLATFORM_ID_ROWS.filter(
    (row) => row.trackingSetup && row.trackingSetup === trackingSetup,
  );
}

export function editablePlatformIdRows(client: {
  marketing_channels: string[] | null;
  tracking_setup: string | null;
}): PlatformIdRowConfig[] {
  const channels = new Set(client.marketing_channels ?? []);
  const tracking = client.tracking_setup;

  return PLATFORM_ID_ROWS.filter((row) => {
    if (row.alwaysShow || row.platform === "ghl" || row.clientField === "ga4_id") {
      return true;
    }
    if (row.channel && channels.has(row.channel)) return true;
    if (row.trackingSetup && tracking === row.trackingSetup) return true;
    return false;
  });
}

export function configuredPlatformIdEntries(
  client: { ga4_id: string | null; marketing_channels: string[] | null; tracking_setup: string | null },
  connections: { platform: string; external_account_id: string | null }[],
): Array<{ key: string; label: string; value: string }> {
  const connectionMap = new Map(
    connections.map((row) => [row.platform, row.external_account_id]),
  );

  const entries: Array<{ key: string; label: string; value: string }> = [];

  for (const row of editablePlatformIdRows(client)) {
    const value =
      row.clientField === "ga4_id"
        ? client.ga4_id
        : connectionMap.get(row.platform);

    if (value?.trim()) {
      entries.push({
        key: row.platform,
        label: row.label.replace(/ ID$/, ""),
        value: value.trim(),
      });
    }
  }

  return entries;
}

export function visiblePlatformIdRows(
  client: {
    marketing_channels: string[] | null;
    tracking_setup: string | null;
  },
): PlatformIdRowConfig[] {
  const channels = new Set(client.marketing_channels ?? []);
  const tracking = client.tracking_setup;

  return PLATFORM_ID_ROWS.filter((row) => {
    if (row.alwaysShow) return true;
    if (row.channel && channels.has(row.channel)) return true;
    if (row.trackingSetup && tracking === row.trackingSetup) return true;
    return false;
  });
}
