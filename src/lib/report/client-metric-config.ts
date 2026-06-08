export type ClientTypeForMetrics = "lead_gen" | "ecommerce";

export type MetricConfigRow = { metric_key: string; metric_value: string };

/** Keys stored in `client_metric_config.metric_key` */
export const LEAD_GEN_METRIC_KEYS = [
  "show_impressions",
  "show_clicks",
  "show_ctr",
  "show_reach",
  "show_frequency",
  "show_landing_page_views",
  "show_impression_share",
  "show_search_lost_is_budget",
  "show_search_lost_is_rank",
] as const;

export const ECOMMERCE_METRIC_KEYS = [
  "show_impressions",
  "show_clicks",
  "show_roas",
  "show_purchase_value",
  "show_purchases",
] as const;

const LEAD_GEN_DEFAULTS: Record<(typeof LEAD_GEN_METRIC_KEYS)[number], boolean> = {
  show_impressions: false,
  show_clicks: false,
  show_ctr: false,
  show_reach: false,
  show_frequency: false,
  show_landing_page_views: false,
  show_impression_share: false,
  show_search_lost_is_budget: false,
  show_search_lost_is_rank: false,
};

const ECOMMERCE_DEFAULTS: Record<(typeof ECOMMERCE_METRIC_KEYS)[number], boolean> = {
  show_impressions: false,
  show_clicks: false,
  show_roas: true,
  show_purchase_value: true,
  show_purchases: true,
};

export type MetricVisibility = Record<string, boolean>;

export function normalizeClientType(raw: string | null | undefined): ClientTypeForMetrics {
  return raw === "ecommerce" ? "ecommerce" : "lead_gen";
}

export function parseMetricValueTrueFalse(v: string | undefined): boolean {
  const s = (v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

export function resolveMetricVisibility(
  clientType: ClientTypeForMetrics,
  rows: MetricConfigRow[] | null | undefined,
): MetricVisibility {
  const fromDb = new Map<string, string>();
  for (const r of rows ?? []) {
    if (r.metric_key) fromDb.set(r.metric_key.trim(), (r.metric_value ?? "").trim());
  }

  const defaults: Record<string, boolean> =
    clientType === "ecommerce"
      ? { ...ECOMMERCE_DEFAULTS }
      : { ...LEAD_GEN_DEFAULTS };

  const merged: MetricVisibility = {};
  merged.show_total_spend = true;
  merged.show_total_conversions = true;
  if (clientType === "lead_gen") {
    merged.show_cost_per_conversion = true;
  } else {
    merged.show_cost_per_conversion = true;
    merged.show_purchases = true;
    merged.show_purchase_value = true;
    merged.show_roas = true;
  }
  for (const [k, def] of Object.entries(defaults)) {
    merged[k] = fromDb.has(k) ? parseMetricValueTrueFalse(fromDb.get(k)) : def;
  }
  return merged;
}

export function isMetricVisible(visibility: MetricVisibility, key: string): boolean {
  return Boolean(visibility[key]);
}

/** When channel-based metrics are enabled, overview uses every legacy optional KPI turned on. */
export function legacyVisibilityAllOptionalEnabled(clientType: ClientTypeForMetrics): MetricVisibility {
  const merged = resolveMetricVisibility(clientType, []);
  for (const key of Object.keys(merged)) {
    merged[key] = true;
  }
  return merged;
}

export type DailyAgg = {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversionValue: number;
};

export type MetaRollup = {
  impressions: number;
  reach: number;
  landingPageViews: number;
};

export type GoogleQualityRollup = {
  impressionShareAvg: number;
  absoluteTopImpressionShareAvg: number;
  searchLostIsBudgetAvg: number;
  searchLostIsRankAvg: number;
};

export function aggregateDailyPerf(
  rows: Array<{
    impressions: number;
    clicks: number;
    spend_cents: number;
    conversions: number;
    conversion_value_cents?: number | null;
  }>,
): DailyAgg {
  return rows.reduce(
    (acc, r) => {
      acc.impressions += Number(r.impressions ?? 0);
      acc.clicks += Number(r.clicks ?? 0);
      acc.spend += Number(r.spend_cents ?? 0) / 100;
      acc.conversions += Number(r.conversions ?? 0);
      acc.conversionValue += Number(r.conversion_value_cents ?? 0) / 100;
      return acc;
    },
    { impressions: 0, clicks: 0, spend: 0, conversions: 0, conversionValue: 0 },
  );
}

export function emptyMetaRollup(): MetaRollup {
  return { impressions: 0, reach: 0, landingPageViews: 0 };
}

export function emptyGoogleQualityRollup(): GoogleQualityRollup {
  return {
    impressionShareAvg: 0,
    absoluteTopImpressionShareAvg: 0,
    searchLostIsBudgetAvg: 0,
    searchLostIsRankAvg: 0,
  };
}
