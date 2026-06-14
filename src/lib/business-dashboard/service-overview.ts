import type {
  BusinessDashboardMrrServiceRow,
  BusinessDashboardServiceOverviewRow,
  BusinessDashboardServiceRow,
} from "@/lib/business-dashboard/types";

export const SERVICE_OVERVIEW_CHANNEL_ORDER = [
  "google_ads",
  "meta_ads",
  "seo",
  "microsoft_ads",
  "tiktok_ads",
  "linkedin_ads",
  "ghl",
  "whatconverts",
] as const;

export const SERVICE_OVERVIEW_HIDDEN_CHANNELS = new Set([
  "ga4",
  "website_maintenance",
]);

function serviceOverviewChannelIndex(channel: string): number {
  const index = (SERVICE_OVERVIEW_CHANNEL_ORDER as readonly string[]).indexOf(
    channel,
  );
  return index === -1 ? SERVICE_OVERVIEW_CHANNEL_ORDER.length : index;
}

export function mergeServiceOverviewRows(
  clientsByService: BusinessDashboardServiceRow[],
  mrrByService: BusinessDashboardMrrServiceRow[],
): BusinessDashboardServiceOverviewRow[] {
  const map = new Map<string, BusinessDashboardServiceOverviewRow>();

  for (const row of clientsByService) {
    map.set(row.channel, {
      channel: row.channel,
      label: row.label,
      clientCount: row.clientCount,
      mrrCadCents: 0,
      averageMrrCadCents: null,
    });
  }

  for (const row of mrrByService) {
    const existing = map.get(row.channel);
    if (existing) {
      existing.mrrCadCents = row.mrrCadCents;
      existing.averageMrrCadCents = row.averageMrrCadCents;
    } else {
      map.set(row.channel, {
        channel: row.channel,
        label: row.label,
        clientCount: 0,
        mrrCadCents: row.mrrCadCents,
        averageMrrCadCents: row.averageMrrCadCents,
      });
    }
  }

  return [...map.values()]
    .filter(
      (row) =>
        !SERVICE_OVERVIEW_HIDDEN_CHANNELS.has(row.channel) &&
        (row.clientCount > 0 || row.mrrCadCents > 0),
    )
    .sort(
      (a, b) =>
        serviceOverviewChannelIndex(a.channel) -
        serviceOverviewChannelIndex(b.channel),
    );
}
