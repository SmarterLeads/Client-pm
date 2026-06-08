import { parseMetricValueTrueFalse, type MetricConfigRow } from "@/lib/report/client-metric-config";

/** Slugs that can have a dedicated metrics section (aligned with report tabs). */
export type ChannelMetricPlatform = "google" | "meta" | "microsoft" | "tiktok";

export const CHANNEL_PLATFORM_ORDER: ChannelMetricPlatform[] = [
  "google",
  "meta",
  "microsoft",
  "tiktok",
];

export const GLOBAL_DEFAULT_CHART_MODE_KEY = "global_default_chart_mode";

export type ChartModeValue = "conversions" | "traffic";

export type ChannelMetricDef = {
  key: string;
  label: string;
};

const GOOGLE: ChannelMetricDef[] = [
  { key: "google_show_impressions", label: "Impressions" },
  { key: "google_show_clicks", label: "Clicks" },
  { key: "google_show_ctr", label: "CTR" },
  { key: "google_show_avg_cpc", label: "Avg CPC" },
  { key: "google_show_cost", label: "Cost" },
  { key: "google_show_conversions", label: "Conversions" },
  { key: "google_show_cost_per_conversion", label: "Cost per Conversion" },
  { key: "google_show_impression_share", label: "Impression Share" },
  { key: "google_show_absolute_top_impression_share", label: "Absolute Top Impression Share" },
  { key: "google_show_impression_share_lost_rank", label: "Lost IS (Rank)" },
  { key: "google_show_impression_share_lost_budget", label: "Lost IS (Budget)" },
  { key: "google_show_campaign_table", label: "Campaign table" },
];

const META: ChannelMetricDef[] = [
  { key: "meta_show_impressions", label: "Impressions" },
  { key: "meta_show_reach", label: "Reach" },
  { key: "meta_show_frequency", label: "Frequency" },
  { key: "meta_show_landing_page_views", label: "Landing Page Views" },
  { key: "meta_show_clicks", label: "Clicks" },
  { key: "meta_show_ctr", label: "CTR" },
  { key: "meta_show_cost", label: "Cost" },
  { key: "meta_show_conversions", label: "Conversions" },
  { key: "meta_show_cost_per_conversion", label: "Cost per Conversion" },
  { key: "meta_show_campaign_table", label: "Campaign table" },
  { key: "meta_show_ytd_table", label: "Year to Date table" },
];

const MICROSOFT: ChannelMetricDef[] = [
  { key: "microsoft_show_impressions", label: "Impressions" },
  { key: "microsoft_show_clicks", label: "Clicks" },
  { key: "microsoft_show_ctr", label: "CTR" },
  { key: "microsoft_show_avg_cpc", label: "Avg CPC" },
  { key: "microsoft_show_cost", label: "Cost" },
  { key: "microsoft_show_conversions", label: "Conversions" },
  { key: "microsoft_show_cost_per_conversion", label: "Cost per Conversion" },
  { key: "microsoft_show_conversion_rate", label: "Conversion Rate" },
  { key: "microsoft_show_impression_share_lost_rank", label: "Lost IS (Rank)" },
  { key: "microsoft_show_impression_share_lost_budget", label: "Lost IS (Budget)" },
  { key: "microsoft_show_campaign_table", label: "Campaign table" },
];

const TIKTOK: ChannelMetricDef[] = [
  { key: "tiktok_show_impressions", label: "Impressions" },
  { key: "tiktok_show_clicks", label: "Clicks" },
  { key: "tiktok_show_ctr", label: "CTR" },
  { key: "tiktok_show_cost", label: "Cost" },
  { key: "tiktok_show_video_views", label: "Video Views" },
  { key: "tiktok_show_conversions", label: "Conversions" },
  { key: "tiktok_show_cost_per_conversion", label: "Cost per Conversion" },
];

/** Overview tab KPIs / sections (also persisted for PDF + report Overview). */
export const OVERVIEW_TAB_GLOBAL_KEYS = [
  "global_show_total_spend",
  "global_show_total_conversions",
  "global_show_cost_per_conversion",
  "global_show_conversion_breakdown",
  "global_show_hero_chart",
] as const;

/** Optional secondary hero KPIs on the Overview tab (lead gen). */
export const OVERVIEW_HERO_SECONDARY_GLOBAL_KEYS = [
  "global_show_impressions",
  "global_show_clicks",
  "global_show_ctr",
  "global_show_reach",
  "global_show_frequency",
  "global_show_landing_page_views",
] as const;

/** Secondary hero KPIs on the Overview tab (ecommerce row 2). */
export const OVERVIEW_HERO_ECOMMERCE_SECONDARY_GLOBAL_KEYS = [
  "global_show_cost_per_purchase",
  "global_show_purchase_value",
  "global_show_roas",
] as const;

export const LEGACY_OVERVIEW_HERO_SECONDARY_KEYS: Record<
  (typeof OVERVIEW_HERO_SECONDARY_GLOBAL_KEYS)[number],
  string
> = {
  global_show_impressions: "show_impressions",
  global_show_clicks: "show_clicks",
  global_show_ctr: "show_ctr",
  global_show_reach: "show_reach",
  global_show_frequency: "show_frequency",
  global_show_landing_page_views: "show_landing_page_views",
};

export const LEGACY_OVERVIEW_HERO_ECOMMERCE_SECONDARY_KEYS: Record<
  (typeof OVERVIEW_HERO_ECOMMERCE_SECONDARY_GLOBAL_KEYS)[number],
  string
> = {
  global_show_cost_per_purchase: "show_purchases",
  global_show_purchase_value: "show_purchase_value",
  global_show_roas: "show_roas",
};

/** Cross-platform toggles (booleans except chart mode). */
const GLOBAL_BOOLEAN: ChannelMetricDef[] = [
  { key: "global_show_overview_tab", label: "Show Overview tab" },
  ...OVERVIEW_TAB_GLOBAL_KEYS.map((key) => {
    const label =
      key === "global_show_total_spend"
        ? "Show total spend (Overview)"
        : key === "global_show_total_conversions"
          ? "Show total conversions (Overview)"
          : key === "global_show_cost_per_conversion"
            ? "Show cost per conversion (Overview)"
            : key === "global_show_conversion_breakdown"
              ? "Show conversion breakdown (Overview)"
              : "Show performance trends chart (Overview)";
    return { key, label };
  }),
  ...OVERVIEW_HERO_SECONDARY_GLOBAL_KEYS.map((key) => {
    const label =
      key === "global_show_impressions"
        ? "Impressions (Overview hero)"
        : key === "global_show_clicks"
          ? "Clicks (Overview hero)"
          : key === "global_show_ctr"
            ? "CTR (Overview hero)"
            : key === "global_show_reach"
              ? "Reach (Overview hero)"
              : key === "global_show_frequency"
                ? "Frequency (Overview hero)"
                : "Landing page views (Overview hero)";
    return { key, label };
  }),
  ...OVERVIEW_HERO_ECOMMERCE_SECONDARY_GLOBAL_KEYS.map((key) => {
    const label =
      key === "global_show_cost_per_purchase"
        ? "Purchases (Overview hero)"
        : key === "global_show_purchase_value"
          ? "Purchase value (Overview hero)"
          : "ROAS (Overview hero)";
    return { key, label };
  }),
];

export function channelMetricsForPlatform(p: ChannelMetricPlatform): ChannelMetricDef[] {
  switch (p) {
    case "google":
      return GOOGLE;
    case "meta":
      return META;
    case "microsoft":
      return MICROSOFT;
    case "tiktok":
      return TIKTOK;
    default:
      return [];
  }
}

export function globalBooleanMetricDefs(): ChannelMetricDef[] {
  return GLOBAL_BOOLEAN;
}

/** Google Ads campaign table — fixed columns (conversion-specific keys added dynamically). */
export const GOOGLE_CAMPAIGN_COL_KEYS = [
  "google_campaign_col_impressions",
  "google_campaign_col_clicks",
  "google_campaign_col_ctr",
  "google_campaign_col_avg_cpc",
  "google_campaign_col_spend",
  "google_campaign_col_conversions",
  "google_campaign_col_cpl",
] as const;

/** Meta Ads campaign table (`CampaignPerformanceTable`). */
export const META_CAMPAIGN_COL_KEYS = [
  "meta_campaign_col_impressions",
  "meta_campaign_col_reach",
  "meta_campaign_col_landing_page_views",
  "meta_campaign_col_clicks",
  "meta_campaign_col_avg_cpc",
  "meta_campaign_col_spend",
  "meta_campaign_col_conversions",
  "meta_campaign_col_cpl",
] as const;

/** Client-specific Meta campaign columns — opt-in only (`metric_value = true` in DB). */
export const META_CAMPAIGN_OPT_IN_COL_KEYS = [
  "meta_campaign_col_contact_forms",
  "meta_campaign_col_purchases",
  "meta_campaign_col_purchase_value",
  "meta_campaign_col_roas",
] as const;

/** Microsoft Ads campaign table. */
export const MICROSOFT_CAMPAIGN_COL_KEYS = [
  "microsoft_campaign_col_impressions",
  "microsoft_campaign_col_clicks",
  "microsoft_campaign_col_ctr",
  "microsoft_campaign_col_avg_cpc",
  "microsoft_campaign_col_spend",
  "microsoft_campaign_col_conversions",
  "microsoft_campaign_col_cpl",
] as const;

export const ROW_PRIMARY_1_KEY = "row_primary_1";
export const ROW_PRIMARY_2_KEY = "row_primary_2";
export const ROW_PRIMARY_3_KEY = "row_primary_3";
export const ROW_PRIMARY_4_KEY = "row_primary_4";
export const ROW_PRIMARY_5_KEY = "row_primary_5";

export const ROW_PRIMARY_KEYS = [
  ROW_PRIMARY_1_KEY,
  ROW_PRIMARY_2_KEY,
  ROW_PRIMARY_3_KEY,
  ROW_PRIMARY_4_KEY,
  ROW_PRIMARY_5_KEY,
] as const;

export const MAX_ROW_PRIMARY_SLOTS = ROW_PRIMARY_KEYS.length;

export const ROW_SHOW_BUDGET_PACING_KEY = "row_show_budget_pacing";
export const ROW_SHOW_SPEND_KEY = "row_show_spend";
export const ROW_SHOW_ALERT_DOT_KEY = "row_show_alert_dot";

const ROW_TOGGLE_KEYS = [
  ROW_SHOW_BUDGET_PACING_KEY,
  ROW_SHOW_SPEND_KEY,
  ROW_SHOW_ALERT_DOT_KEY,
] as const;

export function slugifyConversionRawName(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s.length > 0 ? s : "conversion";
}

/** `breakdown_show_{slug}` for client_metric_config. */
export function breakdownShowMetricKey(rawConversionName: string): string {
  return `breakdown_show_${slugifyConversionRawName(rawConversionName)}`;
}

/** Per conversion-column id from campaign performance state (`conv:` sort keys). */
export function googleCampaignColConvKey(conversionColumnId: string): string {
  return `google_campaign_col_conv_${slugifyConversionRawName(conversionColumnId)}`;
}

/** Every boolean metric key (excludes global_default_chart_mode and row_primary_* UUID values). */
export function allBooleanChannelMetricKeys(): string[] {
  const keys = new Set<string>();
  for (const p of CHANNEL_PLATFORM_ORDER) {
    for (const { key } of channelMetricsForPlatform(p)) keys.add(key);
  }
  for (const { key } of GLOBAL_BOOLEAN) keys.add(key);
  for (const k of GOOGLE_CAMPAIGN_COL_KEYS) keys.add(k);
  for (const k of META_CAMPAIGN_COL_KEYS) keys.add(k);
  for (const k of MICROSOFT_CAMPAIGN_COL_KEYS) keys.add(k);
  for (const k of ROW_TOGGLE_KEYS) keys.add(k);
  return Array.from(keys);
}

export function parseChartModeFromMetricValue(raw: string | undefined): ChartModeValue {
  const s = (raw ?? "").trim().toLowerCase();
  return s === "traffic" ? "traffic" : "conversions";
}

export type ChannelMetricMap = Record<string, boolean>;

/** Defaults: every boolean metric is visible (true). Chart mode defaults to conversions. */
export function defaultChannelBooleanMap(): ChannelMetricMap {
  const m: ChannelMetricMap = {};
  for (const k of allBooleanChannelMetricKeys()) {
    m[k] = true;
  }
  for (const k of OVERVIEW_HERO_SECONDARY_GLOBAL_KEYS) {
    m[k] = false;
  }
  return m;
}

export function mergeChannelMetricRows(
  rows: MetricConfigRow[] | null | undefined,
  /** Used when no `global_default_chart_mode` row exists yet (e.g. sync from `clients.default_chart_mode`). */
  clientChartFallback?: ChartModeValue,
): {
  booleans: ChannelMetricMap;
  chartMode: ChartModeValue;
  rowPrimary1: string | null;
  rowPrimary2: string | null;
  rowPrimaries: Array<string | null>;
} {
  const fromDb = new Map<string, string>();
  for (const r of rows ?? []) {
    if (r.metric_key) fromDb.set(r.metric_key.trim(), (r.metric_value ?? "").trim());
  }

  const booleans: ChannelMetricMap = defaultChannelBooleanMap();

  fromDb.forEach((v, k) => {
    if (k === GLOBAL_DEFAULT_CHART_MODE_KEY) return;
    if (ROW_PRIMARY_KEYS.includes(k as (typeof ROW_PRIMARY_KEYS)[number])) return;
    booleans[k] = parseMetricValueTrueFalse(v);
  });

  let chartMode: ChartModeValue = "conversions";
  if (fromDb.has(GLOBAL_DEFAULT_CHART_MODE_KEY)) {
    chartMode = parseChartModeFromMetricValue(fromDb.get(GLOBAL_DEFAULT_CHART_MODE_KEY));
  } else if (clientChartFallback) {
    chartMode = clientChartFallback;
  }

  const rowPrimaries = ROW_PRIMARY_KEYS.map(
    (key) => (fromDb.get(key) ?? "").trim() || null,
  );
  const rowPrimary1 = rowPrimaries[0] ?? null;
  const rowPrimary2 = rowPrimaries[1] ?? null;

  // Legacy key before rename; prefer explicit `global_show_conversion_breakdown`.
  const legacyBreakdown = fromDb.get("global_show_conversion_breakdown_cards");
  if (legacyBreakdown !== undefined && !fromDb.has("global_show_conversion_breakdown")) {
    booleans.global_show_conversion_breakdown = parseMetricValueTrueFalse(legacyBreakdown);
  }

  for (const [globalKey, legacyKey] of Object.entries(LEGACY_OVERVIEW_HERO_ECOMMERCE_SECONDARY_KEYS)) {
    const legacyVal = fromDb.get(legacyKey);
    if (legacyVal !== undefined && !fromDb.has(globalKey)) {
      booleans[globalKey] = parseMetricValueTrueFalse(legacyVal);
    }
  }

  return { booleans, chartMode, rowPrimary1, rowPrimary2, rowPrimaries };
}

export function isBreakdownShown(booleans: ChannelMetricMap, rawConversionName: string): boolean {
  const key = breakdownShowMetricKey(rawConversionName);
  return booleans[key] !== false;
}

/** Detect new-style channel keys in stored config. */
export function hasChannelMetricKeys(rows: MetricConfigRow[] | null | undefined): boolean {
  for (const r of rows ?? []) {
    const k = (r.metric_key ?? "").trim();
    if (/^(google|meta|microsoft|tiktok|global)_/.test(k)) return true;
  }
  return false;
}

export function isChannelMetricEnabled(map: ChannelMetricMap, key: string): boolean {
  return Boolean(map[key]);
}

export function isChannelPlatformSlug(slug: string): slug is ChannelMetricPlatform {
  return CHANNEL_PLATFORM_ORDER.includes(slug as ChannelMetricPlatform);
}

/** Rows that are not new-style channel / breakdown / campaign-column / compact-row keys (for legacy KPI resolution). */
export function filterLegacyMetricRows(rows: MetricConfigRow[] | null | undefined): MetricConfigRow[] {
  return (rows ?? []).filter((r) => {
    const k = (r.metric_key ?? "").trim();
    if (/^(google|meta|microsoft|tiktok|global)_/.test(k)) return false;
    if (k.startsWith("breakdown_show_")) return false;
    if (k.includes("_campaign_col_")) return false;
    if (
      ROW_PRIMARY_KEYS.includes(k as (typeof ROW_PRIMARY_KEYS)[number]) ||
      k === ROW_SHOW_BUDGET_PACING_KEY ||
      k === ROW_SHOW_SPEND_KEY ||
      k === ROW_SHOW_ALERT_DOT_KEY
    ) {
      return false;
    }
    return true;
  });
}

/** Maps to {@link GoogleAdsCampaignPerformanceTable} sort keys / conv ids. */
export function buildGoogleCampaignColumnVisibility(
  booleans: ChannelMetricMap,
  conversionColumnIds: string[],
): Record<string, boolean> {
  const m: Record<string, boolean> = {};
  m.impressions = booleans.google_campaign_col_impressions !== false;
  m.clicks = booleans.google_campaign_col_clicks !== false;
  m.ctr = booleans.google_campaign_col_ctr !== false;
  m.avgCpc = booleans.google_campaign_col_avg_cpc !== false;
  m.spend = booleans.google_campaign_col_spend !== false;
  m.conversions = booleans.google_campaign_col_conversions !== false;
  m.cpl = booleans.google_campaign_col_cpl !== false;
  for (const id of conversionColumnIds) {
    m[`conv:${id}`] = booleans[googleCampaignColConvKey(id)] !== false;
  }
  return m;
}

export function buildMicrosoftCampaignColumnVisibility(booleans: ChannelMetricMap): Record<string, boolean> {
  return {
    impressions: booleans.microsoft_campaign_col_impressions !== false,
    clicks: booleans.microsoft_campaign_col_clicks !== false,
    ctr: booleans.microsoft_campaign_col_ctr !== false,
    avgCpc: booleans.microsoft_campaign_col_avg_cpc !== false,
    spend: booleans.microsoft_campaign_col_spend !== false,
    conversions: booleans.microsoft_campaign_col_conversions !== false,
    cpl: booleans.microsoft_campaign_col_cpl !== false,
  };
}

/** Meta {@link CampaignPerformanceTable}: independent toggles per metric column. */
export function buildMetaCampaignColumnVisibility(booleans: ChannelMetricMap): Record<string, boolean> {
  return {
    impressions: booleans.meta_campaign_col_impressions !== false,
    reach: booleans.meta_campaign_col_reach !== false,
    landing_page_views: booleans.meta_campaign_col_landing_page_views !== false,
    clicks: booleans.meta_campaign_col_clicks !== false,
    avgCpc: booleans.meta_campaign_col_avg_cpc !== false,
    spend: booleans.meta_campaign_col_spend !== false,
    conversions: booleans.meta_campaign_col_conversions !== false,
    cpl: booleans.meta_campaign_col_cpl !== false,
    contact_forms: booleans.meta_campaign_col_contact_forms === true,
    purchases: booleans.meta_campaign_col_purchases === true,
    purchase_value: booleans.meta_campaign_col_purchase_value === true,
    roas: booleans.meta_campaign_col_roas === true,
  };
}

/** YTD table: same conversion / CPL / avg CPC toggles as the campaign performance table for the active platform. */
export function buildYtdColumnVisibility(
  activeView: string,
  booleans: ChannelMetricMap,
  connectedPlatformSlugs: string[],
): Record<string, boolean> {
  const fromPlatform = (slug: string): Record<string, boolean> => {
    if (slug === "google") {
      return {
        conversions: booleans.google_campaign_col_conversions !== false,
        cpl: booleans.google_campaign_col_cpl !== false,
        avgCpc: booleans.google_campaign_col_avg_cpc !== false,
      };
    }
    if (slug === "meta") {
      return {
        conversions: booleans.meta_campaign_col_conversions !== false,
        cpl: booleans.meta_campaign_col_cpl !== false,
        avgCpc: booleans.meta_campaign_col_avg_cpc !== false,
      };
    }
    if (slug === "microsoft") {
      return {
        conversions: booleans.microsoft_campaign_col_conversions !== false,
        cpl: booleans.microsoft_campaign_col_cpl !== false,
        avgCpc: booleans.microsoft_campaign_col_avg_cpc !== false,
      };
    }
    return { conversions: true, cpl: true, avgCpc: true };
  };

  if (activeView === "overview") {
    if (connectedPlatformSlugs.length === 0) {
      return { conversions: true, cpl: true, avgCpc: true };
    }
    let conversions = false;
    let cpl = false;
    let avgCpc = false;
    for (const slug of connectedPlatformSlugs) {
      const v = fromPlatform(slug);
      conversions = conversions || v.conversions;
      cpl = cpl || v.cpl;
      avgCpc = avgCpc || v.avgCpc;
    }
    return { conversions, cpl, avgCpc };
  }

  return fromPlatform(activeView);
}

export type InternalDashboardCampaignPlatform = "google" | "meta" | "microsoft";

/** Campaign table column ids for the internal dashboard. */
export type InternalCampaignColumnId =
  | "impressions"
  | "clicks"
  | "ctr"
  | "avgCpc"
  | "cost"
  | "conversions"
  | "cpl"
  | "reach"
  | "landingPageViews"
  | "lostRank"
  | "lostBudget";

export type InternalCampaignVisibleColumn = {
  columnId: InternalCampaignColumnId;
  label: string;
  /** When true, column has no campaign-level rollup (renders "—"). */
  kpiOnly: boolean;
};

const INTERNAL_DASHBOARD_CAMPAIGN_COLUMNS: Record<
  InternalDashboardCampaignPlatform,
  InternalCampaignVisibleColumn[]
> = {
  google: [
    { columnId: "impressions", label: "Impressions", kpiOnly: false },
    { columnId: "clicks", label: "Clicks", kpiOnly: false },
    { columnId: "ctr", label: "CTR", kpiOnly: false },
    { columnId: "avgCpc", label: "Avg CPC", kpiOnly: false },
    { columnId: "cost", label: "Cost", kpiOnly: false },
    { columnId: "conversions", label: "Conversions", kpiOnly: false },
    { columnId: "cpl", label: "Cost per Conversion", kpiOnly: false },
    { columnId: "lostRank", label: "Lost IS (Rank)", kpiOnly: true },
    { columnId: "lostBudget", label: "Lost IS (Budget)", kpiOnly: true },
  ],
  meta: [
    { columnId: "impressions", label: "Impressions", kpiOnly: false },
    { columnId: "reach", label: "Reach", kpiOnly: false },
    { columnId: "landingPageViews", label: "Landing Page Views", kpiOnly: false },
    { columnId: "clicks", label: "Clicks", kpiOnly: false },
    { columnId: "cost", label: "Cost", kpiOnly: false },
    { columnId: "conversions", label: "Conversions", kpiOnly: false },
    { columnId: "cpl", label: "Cost per Conversion", kpiOnly: false },
  ],
  microsoft: [
    { columnId: "impressions", label: "Impressions", kpiOnly: false },
    { columnId: "clicks", label: "Clicks", kpiOnly: false },
    { columnId: "ctr", label: "CTR", kpiOnly: false },
    { columnId: "avgCpc", label: "Avg CPC", kpiOnly: false },
    { columnId: "cost", label: "Cost", kpiOnly: false },
    { columnId: "conversions", label: "Conversions", kpiOnly: false },
    { columnId: "cpl", label: "Cost per Conversion", kpiOnly: false },
  ],
};

/** Fixed campaign table columns for the internal dashboard (not gated by client metric config). */
export function buildInternalDashboardCampaignColumns(
  platform: InternalDashboardCampaignPlatform,
): InternalCampaignVisibleColumn[] {
  return INTERNAL_DASHBOARD_CAMPAIGN_COLUMNS[platform];
}
