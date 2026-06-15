import {
  getMarketingChannelLabel,
  MARKETING_CHANNEL_VALUES,
  type ClientCurrency,
} from "@/lib/clients/overview-fields";

export type MrrBreakdown = Record<string, number>;

export const MRR_TRACKING_CRM_KEYS = ["ghl", "whatconverts"] as const;

export type MrrTrackingCrmKey = (typeof MRR_TRACKING_CRM_KEYS)[number];

const TRACKING_CRM_LABELS: Record<MrrTrackingCrmKey, string> = {
  ghl: "Go High Level",
  whatconverts: "WhatConverts",
};

const TRACKING_SETUP_BY_KEY: Record<MrrTrackingCrmKey, string> = {
  ghl: "ghl",
  whatconverts: "whatconverts",
};

export function parseMrrBreakdown(value: unknown): MrrBreakdown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const out: MrrBreakdown = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!key.trim()) continue;
    const cents = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(cents) && cents >= 0) {
      out[key] = Math.round(cents);
    }
  }
  return out;
}

export function sumMrrBreakdown(breakdown: MrrBreakdown): number {
  return Object.values(breakdown).reduce((sum, cents) => sum + (cents ?? 0), 0);
}

export function orderedMrrBreakdownChannels(
  marketingChannels: string[] | null | undefined,
): string[] {
  const selected = new Set((marketingChannels ?? []).filter(Boolean));
  const ordered = MARKETING_CHANNEL_VALUES.filter((channel) =>
    selected.has(channel),
  );
  const extras = [...selected].filter(
    (channel) =>
      !(MARKETING_CHANNEL_VALUES as readonly string[]).includes(channel),
  );
  return [...ordered, ...extras];
}

export function orderedTrackingCrmBreakdownKeys(
  trackingSetup: string | null | undefined,
): MrrTrackingCrmKey[] {
  return MRR_TRACKING_CRM_KEYS.filter(
    (key) => trackingSetup === TRACKING_SETUP_BY_KEY[key],
  );
}

export function activeMrrBreakdownKeys(
  marketingChannels: string[] | null | undefined,
  trackingSetup: string | null | undefined,
): string[] {
  return [
    ...orderedMrrBreakdownChannels(marketingChannels),
    ...orderedTrackingCrmBreakdownKeys(trackingSetup),
  ];
}

export function sumActiveMrrBreakdown(
  breakdown: MrrBreakdown,
  marketingChannels: string[] | null | undefined,
  trackingSetup: string | null | undefined,
): number {
  return activeMrrBreakdownKeys(marketingChannels, trackingSetup).reduce(
    (sum, key) => sum + channelMrrCents(breakdown, key),
    0,
  );
}

export function channelMrrCents(
  breakdown: MrrBreakdown,
  channel: string,
): number {
  return breakdown[channel] ?? 0;
}

export function withChannelMrrCents(
  breakdown: MrrBreakdown,
  channel: string,
  cents: number | null,
): MrrBreakdown {
  return {
    ...breakdown,
    [channel]: cents == null ? 0 : Math.max(0, Math.round(cents)),
  };
}

export function getMrrBreakdownItemLabel(key: string): string {
  if (key in TRACKING_CRM_LABELS) {
    return TRACKING_CRM_LABELS[key as MrrTrackingCrmKey];
  }
  return getMarketingChannelLabel(key);
}

export function mrrBreakdownMismatchMessage(
  breakdownTotalCents: number,
  totalMrrCents: number | null | undefined,
  currency: ClientCurrency = "CAD",
): string | null {
  const total = totalMrrCents ?? 0;
  if (breakdownTotalCents === total) return null;

  const format = (cents: number) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);

  const suffix = currency === "USD" ? " USD" : "";
  return `Breakdown total (${format(breakdownTotalCents)}${suffix}) doesn't match Total MRR (${format(total)}${suffix})`;
}

export { getMarketingChannelLabel };
