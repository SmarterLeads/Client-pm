export type DashboardClientType = "lead_gen" | "ecommerce";
export type DashboardClientTypeFilter = DashboardClientType | "all";
export type DashboardAgencyFilter = "all" | string;
export const ALL_AGENCIES_FILTER = "all" as const;
export const ALL_CLIENT_TYPES_FILTER = "all" as const;
export type DashboardComparisonMode = "prior_period" | "prior_year";
export type DashboardDateRangePreset =
  | "last_7"
  | "last_14"
  | "last_30"
  | "mtd"
  | "last_month"
  | "ytd"
  | "custom";

export type DashboardDateRangeState = {
  preset: DashboardDateRangePreset;
  customStart?: string;
  customEnd?: string;
  comparison: DashboardComparisonMode;
};

export function dashboardRangeQueryKey(state: DashboardDateRangeState) {
  const rangePart =
    state.preset === "custom" && state.customStart && state.customEnd
      ? `custom:${state.customStart}:${state.customEnd}`
      : state.preset;
  return [rangePart, state.comparison] as const;
}

export const leadGenKeys = {
  all: ["lead-gen"] as const,
  allAgencies: () => [...leadGenKeys.all, "agencies", "all"] as const,
  agencies: (clientType: DashboardClientType) =>
    [...leadGenKeys.all, "agencies", clientType] as const,
  agencyClientTypes: (agencyId: DashboardAgencyFilter, includePaused = false) =>
    [
      ...leadGenKeys.all,
      "agency-client-types",
      agencyId,
      includePaused ? "paused" : "active",
    ] as const,
  clients: (
    agencyId: DashboardAgencyFilter,
    clientType: DashboardClientTypeFilter,
    includePaused = false,
  ) =>
    [
      ...leadGenKeys.all,
      "clients",
      agencyId,
      clientType,
      includePaused ? "paused" : "active",
    ] as const,
  clientPlatforms: (clientId: string) =>
    [...leadGenKeys.all, "platforms", clientId] as const,
  primaryMetrics: (
    clientId: string,
    clientType: DashboardClientType,
    rangeKey: readonly [string, DashboardComparisonMode],
  ) => [...leadGenKeys.all, "primary-metrics", clientId, clientType, ...rangeKey] as const,
  spendBudget: (clientId: string) =>
    [...leadGenKeys.all, "spend-budget", clientId] as const,
  alerts: (clientId: string) => [...leadGenKeys.all, "alerts", clientId] as const,
  conversionBanner: (clientId: string) =>
    [...leadGenKeys.all, "conversion-banner", clientId] as const,
  platformTotals: (clientId: string, platformsKey: string, rangeKey: readonly [string, DashboardComparisonMode]) =>
    [...leadGenKeys.all, "platform-totals", clientId, platformsKey, ...rangeKey] as const,
  platformBudgetPacing: (clientId: string, platformsKey: string) =>
    [...leadGenKeys.all, "platform-budget-pacing", clientId, platformsKey] as const,
  heroSeries: (
    clientId: string,
    platformsKey: string,
    mode: string,
    rangeKey: readonly [string, DashboardComparisonMode],
  ) => [...leadGenKeys.all, "hero-series", clientId, platformsKey, mode, ...rangeKey] as const,
  dailyKpis: (
    clientId: string,
    platform: string,
    clientType: DashboardClientType,
    rangeKey: readonly [string, DashboardComparisonMode],
  ) =>
    [...leadGenKeys.all, "daily-kpis", clientId, platform, clientType, ...rangeKey] as const,
  conversionBreakdown: (
    clientId: string,
    platform: string,
    rangeKey: readonly [string, DashboardComparisonMode],
  ) => [...leadGenKeys.all, "conversion-breakdown", clientId, platform, ...rangeKey] as const,
  clientMetricBooleans: (clientId: string) =>
    [...leadGenKeys.all, "client-metric-booleans", clientId] as const,
  campaignPerformance: (
    clientId: string,
    platform: string,
    rangeKey: readonly [string, DashboardComparisonMode],
  ) => [...leadGenKeys.all, "campaign-performance", clientId, platform, ...rangeKey] as const,
  ghlDashboard: (clientId: string) =>
    [...leadGenKeys.all, "ghl-dashboard", clientId] as const,
};
