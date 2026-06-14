import type {
  BusinessDashboardMrrServiceRow,
  BusinessDashboardServiceOverviewRow,
  BusinessDashboardServiceRow,
} from "@/lib/business-dashboard/types";

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
    .filter((row) => row.clientCount > 0 || row.mrrCadCents > 0)
    .sort((a, b) => {
      if (b.clientCount !== a.clientCount) {
        return b.clientCount - a.clientCount;
      }
      return b.mrrCadCents - a.mrrCadCents;
    });
}
