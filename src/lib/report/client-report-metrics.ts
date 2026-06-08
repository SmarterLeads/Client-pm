import {
  aggregateSearchLostIsFromDailyRows,
  type SearchLostIsRollup,
} from "@/lib/lead-gen/search-lost-is";
import {
  configsForActiveDisplayNames,
  compareConversionBreakdownOrder,
  conversionDisplayNameKey,
} from "@/lib/conversions/conversion-scope";
import type { ReportSeriesPoint } from "@/components/marketing/report/performance-line-chart";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import {
  type ActiveConversionPairIndex,
  activeConversionPairKey,
  canonicalReportPlatformSlug,
  displayPlatformLabel,
  platformSlugMatchesRow,
  resolveMetaPurchaseEventNames,
  fetchGooglePurchaseConversionDailyRows,
} from "@/lib/report/report-tab-platform";
import {
  isStJamesClient,
  isStJamesCombinedGooglePurchaseEvent,
  ST_JAMES_COMBINED_PURCHASE_LABEL,
  ST_JAMES_COMBINED_PURCHASE_MERGE_BUCKET,
  ST_JAMES_COMBINED_GOOGLE_PURCHASE_EVENTS,
} from "@/lib/report/st-james-report-config";
import {
  isBreakdownShown,
  isChannelMetricEnabled,
  type ChannelMetricMap,
} from "@/lib/report/channel-metric-config";
import {
  type ClientTypeForMetrics,
  type DailyAgg,
  type GoogleQualityRollup,
  type MetaRollup,
  type MetricVisibility,
  emptyMetaRollup,
  isMetricVisible,
} from "@/lib/report/client-metric-config";
 
type SB = SupabaseClient<Database>;
 
export type DailyPerfRow = {
  report_date: string;
  platform: string;
  spend_cents: number;
  conversions: number;
  impressions: number;
  clicks: number;
  conversion_value_cents?: number | null;
  roas?: number | null;
  search_lost_rank?: number | null;
  search_lost_budget?: number | null;
};
 
export type DateWindow = {
  currentStart: string;
  currentEnd: string;
  priorStart: string;
  priorEnd: string;
};
 
export type KpiStat = {
  label: string;
  current: number;
  prior: number;
  format: "currency" | "number" | "percent" | "multiplier";
  /** When true, a decrease vs prior period is favorable (green). */
  lowerIsBetter?: boolean;
};
 
export type ChannelSummary = {
  name: string;
  spend: number;
  conversions: number;
};
 
/** Row shape needed to merge conversions (breakdown cards + campaign table). */
export type BreakdownCfg = {
  id: string;
  raw_name: string;
  platform: string;
  display_name: string | null;
  mapped_name: string | null;
  sort_order: number | null;
  is_primary: boolean | null;
  is_active?: boolean | null;
  conversion_type: string;
  group_name: string | null;
};
 
type BucketAgg = {
  bucketKey: string;
  canonicalLabel: string;
  pairKeys: Set<string>;
  sortOrderMin: number;
  hasPrimary: boolean;
  bestConfig: BreakdownCfg;
};
 
export function rowLabel(c: Pick<BreakdownCfg, "display_name" | "mapped_name" | "raw_name">): string {
  return c.display_name?.trim() || c.mapped_name?.trim() || c.raw_name || "";
}

function normalizeStJamesGooglePurchaseConfigs(cfgs: BreakdownCfg[], clientId: string): BreakdownCfg[] {
  if (!isStJamesClient(clientId)) return cfgs;

  const out = [...cfgs];
  for (const raw of ST_JAMES_COMBINED_GOOGLE_PURCHASE_EVENTS) {
    const hasRaw = out.some(
      (c) => (c.raw_name ?? "").trim().toLowerCase() === raw.trim().toLowerCase(),
    );
    if (hasRaw) continue;
    out.push({
      id: `synthetic:st-james:purchase:${raw}`,
      raw_name: raw,
      platform: "google",
      display_name: ST_JAMES_COMBINED_PURCHASE_LABEL,
      mapped_name: null,
      sort_order: 0,
      is_primary: true,
      is_active: true,
      conversion_type: "purchase",
      group_name: ST_JAMES_COMBINED_PURCHASE_LABEL,
    });
  }

  return out.map((c) => {
    if (
      !isStJamesCombinedGooglePurchaseEvent(c.raw_name) ||
      !platformSlugMatchesRow(c.platform ?? "", "google")
    ) {
      return c;
    }
    return {
      ...c,
      display_name: ST_JAMES_COMBINED_PURCHASE_LABEL,
      group_name: ST_JAMES_COMBINED_PURCHASE_LABEL,
      conversion_type: "purchase",
    };
  });
}

function appendEcommercePurchaseBreakdownConfigs(
  cfgs: BreakdownCfg[],
  platformSlug: string | null,
  purchaseEventNames: string[],
): BreakdownCfg[] {
  if (!purchaseEventNames.length) return cfgs;
  if (platformSlug && platformSlug !== "meta") return cfgs;

  const out = [...cfgs];
  for (const raw of purchaseEventNames) {
    const exists = out.some(
      (c) =>
        (c.raw_name ?? "").trim().toLowerCase() === raw.toLowerCase() &&
        platformSlugMatchesRow(c.platform ?? "", "meta"),
    );
    if (exists) continue;
    out.push({
      id: `synthetic:purchase:${raw}`,
      raw_name: raw,
      platform: "meta",
      display_name: "Purchases",
      mapped_name: null,
      sort_order: 0,
      is_primary: true,
      is_active: true,
      conversion_type: "purchase",
      group_name: "Conversions",
    });
  }
  return out;
}
 
function conversionHaystack(c: BreakdownCfg): string {
  return [c.display_name, c.mapped_name, c.raw_name, c.platform]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter((x) => x.length > 0)
    .join(" ")
    .toLowerCase();
}
 
export function conversionMergeBucket(c: BreakdownCfg): string | null {
  if (
    isStJamesCombinedGooglePurchaseEvent(c.raw_name) &&
    platformSlugMatchesRow(c.platform ?? "", "google")
  ) {
    return ST_JAMES_COMBINED_PURCHASE_MERGE_BUCKET;
  }

  // NEW: Check group_name first - if it exists, use it for merging
  if (c.group_name?.trim()) {
    return `merge:group:${c.group_name.trim().toLowerCase()}`;
  }
 
  // Keep existing merge logic as fallback
  const lbl = rowLabel(c);
  const lc = lbl.toLowerCase();
  const hay = conversionHaystack(c);
  const plat = (c.platform ?? "").trim().toLowerCase();
 
  const compact = hay.replace(/[\s_-]/g, "");
  const freeAssessment =
    /\bfree[-\s]?assessment\b/i.test(hay) ||
    compact.includes("freeassessment") ||
    (hay.includes("free") && hay.includes("assessment")) ||
    (hay.includes("free") && /\b(eval|evaluation)\b/i.test(hay));
  if (freeAssessment) return "merge:free-assessment";
 
  const mergedConsult =
    /^consult$/i.test(lbl.trim()) ||
    /\bconsults\b/i.test(lc) ||
    (hay.includes("contact") && hay.includes("catch") && hay.includes("all"));
  if (mergedConsult) return "merge:consults";
 
  const chatLike =
    (hay.includes("ghl") && hay.includes("chat")) ||
    (plat === "meta" && /ghl.*chat|chat.*(final|ghl)|messaging/i.test(hay)) ||
    /ghl[_\s-]*chat|chat[_\s-]*final/i.test(hay);
  if (chatLike) return "merge:ghl-chat-final";
 
  if (
    plat === "ghl" &&
    !hay.includes("chat") &&
    (/\bcalls?\b/i.test(hay) || /\bphone\b/i.test(hay) || /\bcall\b/i.test(hay))
  ) {
    return "merge:ghl-call-final";
  }
 
  const callLike =
    (hay.includes("ghl") && /\bcalls?\b/i.test(hay)) ||
    (plat === "meta" &&
      /\b(calls?|phone)\b/i.test(hay) &&
      /ghl|highlevel|final|conversation/i.test(hay) &&
      !hay.includes("chat")) ||
    /ghl[_\s-]*call|call[_\s-]*final|phone_call|calls_from/i.test(hay);
  if (callLike) return "merge:ghl-call-final";
 
  return null;
}
 
export function canonicalMergeLabel(bucketId: string, fallbackLabel: string): string {
  // NEW: Handle group-based merges by using the group name
  if (bucketId.startsWith("merge:group:")) {
    return fallbackLabel;
  }
  
  // Existing hardcoded labels
  if (bucketId === ST_JAMES_COMBINED_PURCHASE_MERGE_BUCKET) {
    return ST_JAMES_COMBINED_PURCHASE_LABEL;
  }
  if (bucketId === "merge:free-assessment") return "Free Assessment";
  if (bucketId === "merge:consults") return "Consults";
  if (bucketId === "merge:ghl-chat-final") return "GHL Chat";
  if (bucketId === "merge:ghl-call-final") return "GHL Call";
  return fallbackLabel;
}
 
export async function fetchDailyPerformance(supabase: SB, clientId: string, start: string, end: string) {
  const rows: DailyPerfRow[] = [];
  const pageSize = 1000;
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("daily_performance")
      .select(
        "report_date, platform, spend_cents, conversions, impressions, clicks, conversion_value_cents, roas, search_lost_rank, search_lost_budget",
      )
      .eq("client_id", clientId)
      .gte("report_date", start)
      .lte("report_date", end)
      .order("report_date", { ascending: true })
      .order("platform", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;

    const batch = (data ?? []) as DailyPerfRow[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
}

export async function fetchClientMetricConfigRows(supabase: SB, clientId: string) {
  const { data, error } = await supabase
    .from("client_metric_config")
    .select("metric_key, metric_value")
    .eq("client_id", clientId);
  if (error) throw error;
  return (data ?? []) as { metric_key: string; metric_value: string }[];
}

/** Meta-only rollups from `campaign_daily_performance` (reach, LPV, impressions). */
export async function fetchMetaCampaignRollupsForWindow(
  supabase: SB,
  clientId: string,
  start: string,
  end: string,
): Promise<MetaRollup> {
  const { data: campaignsRaw, error: cErr } = await supabase
    .from("campaigns")
    .select("id, platform")
    .eq("client_id", clientId);
  if (cErr) return emptyMetaRollup();
  const metaIds = (campaignsRaw ?? [])
    .filter((c) => platformSlugMatchesRow(c.platform ?? "", "meta"))
    .map((c) => c.id);
  if (metaIds.length === 0) return emptyMetaRollup();

  const { data: daily, error: dErr } = await supabase
    .from("campaign_daily_performance")
    .select("impressions, reach, landing_page_views")
    .eq("client_id", clientId)
    .in("campaign_id", metaIds)
    .gte("report_date", start)
    .lte("report_date", end);
  if (dErr) return emptyMetaRollup();

  let impressions = 0;
  let reach = 0;
  let landingPageViews = 0;
  for (const r of daily ?? []) {
    impressions += Number(r.impressions ?? 0);
    reach += Number(r.reach ?? 0);
    landingPageViews += Number(r.landing_page_views ?? 0);
  }
  return { impressions, reach, landingPageViews };
}

function ctrPct(agg: DailyAgg): number {
  if (agg.impressions <= 0) return 0;
  return (agg.clicks / agg.impressions) * 100;
}

function frequencyFromMeta(meta: MetaRollup): number {
  if (meta.reach <= 0) return 0;
  return meta.impressions / meta.reach;
}

export function searchLostForPlatformRows(
  rows: DailyPerfRow[],
  platformSlug: string,
  start: string,
  end: string,
): SearchLostIsRollup {
  const filtered = rows.filter((r) => platformSlugMatchesRow(r.platform ?? "", platformSlug));
  return aggregateSearchLostIsFromDailyRows(filtered, start, end);
}

export type ReportHeroKpisSplit = { primary: KpiStat[]; secondary: KpiStat[] };

/** Flatten for PDF and layouts that use a single KPI grid. */
export function flattenReportHeroKpis(split: ReportHeroKpisSplit): KpiStat[] {
  return [...split.primary, ...split.secondary];
}

function primaryKpiVisible(
  overviewGlobals: ChannelMetricMap | undefined,
  globalKey: string,
  legacyVisibilityKey: string,
  visibility: MetricVisibility,
): boolean {
  if (overviewGlobals) return isChannelMetricEnabled(overviewGlobals, globalKey);
  return isMetricVisible(visibility, legacyVisibilityKey);
}

export function buildReportHeroKpis(input: {
  clientType: ClientTypeForMetrics;
  visibility: MetricVisibility;
  current: DailyAgg;
  prior: DailyAgg;
  convCurrent: number;
  convPrior: number;
  metaCurrent: MetaRollup;
  metaPrior: MetaRollup;
  googleQualityCurrent: GoogleQualityRollup;
  googleQualityPrior: GoogleQualityRollup;
  /** When set (channel-based report Overview), gates the three summary cards via `global_show_*`. */
  overviewGlobalBooleans?: ChannelMetricMap;
  /** Ecommerce row 2 — purchase-type conversions only. */
  purchasesCurrent?: number;
  purchasesPrior?: number;
  purchaseValueCurrent?: number;
  purchaseValuePrior?: number;
  /** Platform tabs: hide row 2 when the channel has no purchase conversions configured. */
  includeEcommerceSecondaryRow?: boolean;
  /** Always show Purchases / Purchase Value / ROAS (Little Canadian hero row 2). */
  alwaysShowEcommerceSecondaryRow?: boolean;
  /** Platform tabs use shorter primary labels (Spend / Conversions). */
  compactPrimaryLabels?: boolean;
}): ReportHeroKpisSplit {
  const {
    clientType,
    visibility,
    current,
    prior,
    convCurrent,
    convPrior,
    metaCurrent,
    metaPrior,
    googleQualityCurrent,
    googleQualityPrior,
    overviewGlobalBooleans,
    purchasesCurrent = 0,
    purchasesPrior = 0,
    purchaseValueCurrent = 0,
    purchaseValuePrior = 0,
    includeEcommerceSecondaryRow = true,
    alwaysShowEcommerceSecondaryRow = false,
    compactPrimaryLabels = false,
  } = input;

  const primary: KpiStat[] = [];
  const secondary: KpiStat[] = [];
  const pushPrimary = (globalKey: string, legacyKey: string, kpi: KpiStat) => {
    if (primaryKpiVisible(overviewGlobalBooleans, globalKey, legacyKey, visibility)) primary.push(kpi);
  };
  const pushSecondary = (
    legacyKey: string,
    globalKey: string | undefined,
    kpi: KpiStat,
  ) => {
    const visible =
      overviewGlobalBooleans && globalKey
        ? isChannelMetricEnabled(overviewGlobalBooleans, globalKey)
        : isMetricVisible(visibility, legacyKey);
    if (visible) secondary.push(kpi);
  };
  const push = (legacyKey: string, kpi: KpiStat) => {
    pushSecondary(legacyKey, undefined, kpi);
  };

  const cplCur = convCurrent > 0 ? current.spend / convCurrent : 0;
  const cplPrior = convPrior > 0 ? prior.spend / convPrior : 0;

  const conversionsPrimaryVisible = primaryKpiVisible(
    overviewGlobalBooleans,
    "global_show_total_conversions",
    "show_total_conversions",
    visibility,
  );
  const reachPrimaryVisible =
    !conversionsPrimaryVisible &&
    primaryKpiVisible(overviewGlobalBooleans, "global_show_reach", "show_reach", visibility);
  const clicksPrimaryVisible =
    !conversionsPrimaryVisible &&
    primaryKpiVisible(overviewGlobalBooleans, "global_show_clicks", "show_clicks", visibility);

  pushPrimary("global_show_total_spend", "show_total_spend", {
    label: compactPrimaryLabels ? "Spend" : "Total Spend",
    current: current.spend,
    prior: prior.spend,
    format: "currency",
  });
  if (conversionsPrimaryVisible) {
    pushPrimary("global_show_total_conversions", "show_total_conversions", {
      label: compactPrimaryLabels ? "Conversions" : "Total Conversions",
      current: convCurrent,
      prior: convPrior,
      format: "number",
    });
  }
  if (reachPrimaryVisible) {
    primary.push({
      label: compactPrimaryLabels ? "Reach" : "Reach (Meta)",
      current: metaCurrent.reach,
      prior: metaPrior.reach,
      format: "number",
    });
  }
  if (clicksPrimaryVisible) {
    primary.push({
      label: "Clicks",
      current: current.clicks,
      prior: prior.clicks,
      format: "number",
    });
  }
  pushPrimary("global_show_cost_per_conversion", "show_cost_per_conversion", {
    label: "Cost per Conversion",
    current: cplCur,
    prior: cplPrior,
    format: "currency",
  });

  if (clientType === "lead_gen") {
    pushSecondary("show_impressions", "global_show_impressions", {
      label: "Impressions",
      current: current.impressions,
      prior: prior.impressions,
      format: "number",
    });
    if (!clicksPrimaryVisible) {
      pushSecondary("show_clicks", "global_show_clicks", {
        label: "Clicks",
        current: current.clicks,
        prior: prior.clicks,
        format: "number",
      });
    }
    pushSecondary("show_ctr", "global_show_ctr", {
      label: "CTR",
      current: ctrPct(current),
      prior: ctrPct(prior),
      format: "percent",
    });
    if (!reachPrimaryVisible) {
      pushSecondary("show_reach", "global_show_reach", {
        label: "Reach (Meta)",
        current: metaCurrent.reach,
        prior: metaPrior.reach,
        format: "number",
      });
    }
    pushSecondary("show_frequency", "global_show_frequency", {
      label: "Frequency (Meta)",
      current: frequencyFromMeta(metaCurrent),
      prior: frequencyFromMeta(metaPrior),
      format: "number",
    });
    pushSecondary("show_landing_page_views", "global_show_landing_page_views", {
      label: "Landing Page Views (Meta)",
      current: metaCurrent.landingPageViews,
      prior: metaPrior.landingPageViews,
      format: "number",
    });
    push("show_impression_share", {
      label: "Impression Share (Google)",
      current: googleQualityCurrent.impressionShareAvg,
      prior: googleQualityPrior.impressionShareAvg,
      format: "percent",
    });
    pushSecondary("show_search_lost_is_budget", "google_show_impression_share_lost_budget", {
      label: "Lost IS (Budget) (Google)",
      current: googleQualityCurrent.searchLostIsBudgetAvg,
      prior: googleQualityPrior.searchLostIsBudgetAvg,
      format: "percent",
      lowerIsBetter: true,
    });
    pushSecondary("show_search_lost_is_rank", "google_show_impression_share_lost_rank", {
      label: "Lost IS (Rank) (Google)",
      current: googleQualityCurrent.searchLostIsRankAvg,
      prior: googleQualityPrior.searchLostIsRankAvg,
      format: "percent",
      lowerIsBetter: true,
    });
  } else if (includeEcommerceSecondaryRow) {
    const roasCur = current.spend > 0 ? purchaseValueCurrent / current.spend : 0;
    const roasPrior = prior.spend > 0 ? purchaseValuePrior / prior.spend : 0;

    const purchasesKpi: KpiStat = {
      label: "Purchases",
      current: purchasesCurrent,
      prior: purchasesPrior,
      format: "number",
    };
    const purchaseValueKpi: KpiStat = {
      label: "Purchase Value",
      current: purchaseValueCurrent,
      prior: purchaseValuePrior,
      format: "currency",
    };
    const roasKpi: KpiStat = {
      label: "ROAS",
      current: roasCur,
      prior: roasPrior,
      format: "multiplier",
    };

    if (alwaysShowEcommerceSecondaryRow) {
      secondary.push(purchasesKpi, purchaseValueKpi, roasKpi);
    } else {
      pushSecondary("show_purchases", "global_show_cost_per_purchase", purchasesKpi);
      pushSecondary("show_purchase_value", "global_show_purchase_value", purchaseValueKpi);
      pushSecondary("show_roas", "global_show_roas", roasKpi);
    }
  }

  return { primary, secondary };
}

function channelMetricOn(channel: ChannelMetricMap, key: string): boolean {
  return channel[key] !== false;
}

/**
 * Hero KPIs for a single paid channel tab using `google_show_*`, `meta_show_*`, etc.
 * Table visibility keys are ignored here (handled on the report page).
 */
export function buildPlatformHeroKpis(input: {
  platformSlug: string;
  clientType: ClientTypeForMetrics;
  channel: ChannelMetricMap;
  current: DailyAgg;
  prior: DailyAgg;
  convCurrent: number;
  convPrior: number;
  metaCurrent: MetaRollup;
  metaPrior: MetaRollup;
  googleQualityCurrent: GoogleQualityRollup;
  googleQualityPrior: GoogleQualityRollup;
  searchLostCurrent: SearchLostIsRollup;
  searchLostPrior: SearchLostIsRollup;
}): KpiStat[] {
  const slug = input.platformSlug.trim().toLowerCase();
  const {
    clientType,
    channel,
    current,
    prior,
    convCurrent,
    convPrior,
    metaCurrent,
    metaPrior,
    googleQualityCurrent,
    googleQualityPrior,
    searchLostCurrent,
    searchLostPrior,
  } = input;

  const out: KpiStat[] = [];
  const push = (metricKey: string, kpi: KpiStat) => {
    if (!channelMetricOn(channel, metricKey)) return;
    out.push(kpi);
  };

  const ctrCur = ctrPct(current);
  const ctrPrior = ctrPct(prior);
  const cpcCur = current.clicks > 0 ? current.spend / current.clicks : 0;
  const cpcPrior = prior.clicks > 0 ? prior.spend / prior.clicks : 0;
  const cplCur = convCurrent > 0 ? current.spend / convCurrent : 0;
  const cplPrior = convPrior > 0 ? prior.spend / convPrior : 0;

  const convLabel = clientType === "ecommerce" ? "Purchases" : "Conversions";
  const cpcLabel = clientType === "ecommerce" ? "Cost per Purchase" : "Cost per Conversion";

  if (slug === "google") {
    push("google_show_impressions", {
      label: "Impressions",
      current: current.impressions,
      prior: prior.impressions,
      format: "number",
    });
    push("google_show_clicks", {
      label: "Clicks",
      current: current.clicks,
      prior: prior.clicks,
      format: "number",
    });
    push("google_show_ctr", {
      label: "CTR",
      current: ctrCur,
      prior: ctrPrior,
      format: "percent",
    });
    push("google_show_avg_cpc", {
      label: "Avg CPC",
      current: cpcCur,
      prior: cpcPrior,
      format: "currency",
    });
    push("google_show_cost", {
      label: "Cost",
      current: current.spend,
      prior: prior.spend,
      format: "currency",
    });
    push("google_show_conversions", {
      label: convLabel,
      current: convCurrent,
      prior: convPrior,
      format: "number",
    });
    push("google_show_cost_per_conversion", {
      label: cpcLabel,
      current: cplCur,
      prior: cplPrior,
      format: "currency",
    });
    push("google_show_impression_share", {
      label: "Impression Share",
      current: googleQualityCurrent.impressionShareAvg,
      prior: googleQualityPrior.impressionShareAvg,
      format: "percent",
    });
    push("google_show_absolute_top_impression_share", {
      label: "Absolute Top Impression Share",
      current: googleQualityCurrent.absoluteTopImpressionShareAvg,
      prior: googleQualityPrior.absoluteTopImpressionShareAvg,
      format: "percent",
    });
    push("google_show_impression_share_lost_budget", {
      label: "Lost IS (Budget)",
      current: searchLostCurrent.searchLostBudgetAvg,
      prior: searchLostPrior.searchLostBudgetAvg,
      format: "percent",
      lowerIsBetter: true,
    });
    push("google_show_impression_share_lost_rank", {
      label: "Lost IS (Rank)",
      current: searchLostCurrent.searchLostRankAvg,
      prior: searchLostPrior.searchLostRankAvg,
      format: "percent",
      lowerIsBetter: true,
    });
    return out;
  }

  if (slug === "meta") {
    push("meta_show_impressions", {
      label: "Impressions",
      current: current.impressions,
      prior: prior.impressions,
      format: "number",
    });
    push("meta_show_reach", {
      label: "Reach",
      current: metaCurrent.reach,
      prior: metaPrior.reach,
      format: "number",
    });
    push("meta_show_frequency", {
      label: "Frequency",
      current: frequencyFromMeta(metaCurrent),
      prior: frequencyFromMeta(metaPrior),
      format: "number",
    });
    push("meta_show_landing_page_views", {
      label: "Landing Page Views",
      current: metaCurrent.landingPageViews,
      prior: metaPrior.landingPageViews,
      format: "number",
    });
    push("meta_show_clicks", {
      label: "Clicks",
      current: current.clicks,
      prior: prior.clicks,
      format: "number",
    });
    push("meta_show_ctr", {
      label: "CTR",
      current: ctrCur,
      prior: ctrPrior,
      format: "percent",
    });
    push("meta_show_cost", {
      label: "Cost",
      current: current.spend,
      prior: prior.spend,
      format: "currency",
    });
    push("meta_show_conversions", {
      label: convLabel,
      current: convCurrent,
      prior: convPrior,
      format: "number",
    });
    push("meta_show_cost_per_conversion", {
      label: cpcLabel,
      current: cplCur,
      prior: cplPrior,
      format: "currency",
    });
    return out;
  }

  if (slug === "microsoft") {
    const convRateCur = current.clicks > 0 ? (current.conversions / current.clicks) * 100 : 0;
    const convRatePrior = prior.clicks > 0 ? (prior.conversions / prior.clicks) * 100 : 0;
    push("microsoft_show_impressions", {
      label: "Impressions",
      current: current.impressions,
      prior: prior.impressions,
      format: "number",
    });
    push("microsoft_show_clicks", {
      label: "Clicks",
      current: current.clicks,
      prior: prior.clicks,
      format: "number",
    });
    push("microsoft_show_ctr", {
      label: "CTR",
      current: ctrCur,
      prior: ctrPrior,
      format: "percent",
    });
    push("microsoft_show_avg_cpc", {
      label: "Avg CPC",
      current: cpcCur,
      prior: cpcPrior,
      format: "currency",
    });
    push("microsoft_show_cost", {
      label: "Cost",
      current: current.spend,
      prior: prior.spend,
      format: "currency",
    });
    push("microsoft_show_conversions", {
      label: convLabel,
      current: convCurrent,
      prior: convPrior,
      format: "number",
    });
    push("microsoft_show_cost_per_conversion", {
      label: cpcLabel,
      current: cplCur,
      prior: cplPrior,
      format: "currency",
    });
    push("microsoft_show_conversion_rate", {
      label: "Conversion Rate",
      current: convRateCur,
      prior: convRatePrior,
      format: "percent",
    });
    push("microsoft_show_impression_share_lost_rank", {
      label: "Lost IS (Rank)",
      current: searchLostCurrent.searchLostRankAvg,
      prior: searchLostPrior.searchLostRankAvg,
      format: "percent",
      lowerIsBetter: true,
    });
    push("microsoft_show_impression_share_lost_budget", {
      label: "Lost IS (Budget)",
      current: searchLostCurrent.searchLostBudgetAvg,
      prior: searchLostPrior.searchLostBudgetAvg,
      format: "percent",
      lowerIsBetter: true,
    });
    return out;
  }

  if (slug === "tiktok") {
    push("tiktok_show_impressions", {
      label: "Impressions",
      current: current.impressions,
      prior: prior.impressions,
      format: "number",
    });
    push("tiktok_show_clicks", {
      label: "Clicks",
      current: current.clicks,
      prior: prior.clicks,
      format: "number",
    });
    push("tiktok_show_ctr", {
      label: "CTR",
      current: ctrCur,
      prior: ctrPrior,
      format: "percent",
    });
    push("tiktok_show_cost", {
      label: "Cost",
      current: current.spend,
      prior: prior.spend,
      format: "currency",
    });
    push("tiktok_show_video_views", {
      label: "Video Views",
      current: 0,
      prior: 0,
      format: "number",
    });
    push("tiktok_show_conversions", {
      label: convLabel,
      current: convCurrent,
      prior: convPrior,
      format: "number",
    });
    push("tiktok_show_cost_per_conversion", {
      label: cpcLabel,
      current: cplCur,
      prior: cplPrior,
      format: "currency",
    });
    return out;
  }

  return out;
}

/** Same % / "New" / "0%" logic as ConversionBreakdownCards. */
export function formatConversionDeltaLine(current: number, prior: number): string {
  if (prior > 0) {
    const pct = ((current - prior) / prior) * 100;
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
  }
  if (prior === 0 && current > 0) return "New";
  return "0%";
}
 
/** When there are no `client_conversions` rows yet, build up to 4 breakdown cards from `conversion_events`. */
async function fetchConversionBreakdownFromEventsOnly(
  supabase: SB,
  clientId: string,
  windows: DateWindow,
  platformSlug: string | null,
  activePairs: ActiveConversionPairIndex,
  opts?: { breakdownBooleans?: ChannelMetricMap },
): Promise<
  Array<{
    id: string;
    label: string;
    conversionType: string;
    current: number;
    prior: number;
  }>
> {
  if (activePairs.rawNames.length === 0) return [];
 
  const { data: events, error: eErr } = await supabase
    .from("conversion_events")
    .select("occurred_on, event_count, event_name, platform")
    .eq("client_id", clientId)
    .in("event_name", activePairs.rawNames)
    .gte("occurred_on", windows.priorStart)
    .lte("occurred_on", windows.currentEnd);
  if (eErr) throw eErr;
 
  const byPair = new Map<string, { current: number; prior: number; label: string; rawName: string }>();
  for (const ev of events ?? []) {
    if (platformSlug && !platformSlugMatchesRow(ev.platform ?? "", platformSlug)) continue;
    const eventName = (ev.event_name ?? "").trim();
    if (!eventName) continue;
    const key = activeConversionPairKey(ev.platform ?? "", eventName);
    if (!activePairs.pairSet.has(key) && !activePairs.rawNames.includes(eventName)) continue;
    const n = Number(ev.event_count ?? 0);
    const name = (ev.event_name ?? "").trim() || "Conversion";
    const agg = byPair.get(key) ?? { current: 0, prior: 0, label: name, rawName: name };
    agg.rawName = (ev.event_name ?? "").trim() || name;
    if (ev.occurred_on >= windows.currentStart) agg.current += n;
    else if (ev.occurred_on >= windows.priorStart && ev.occurred_on <= windows.priorEnd) {
      agg.prior += n;
    }
    byPair.set(key, agg);
  }
 
  return Array.from(byPair.entries())
    .map(([key, v]) => ({
      id: `event:${key}`,
      label: v.label,
      conversionType: "other",
      current: v.current,
      prior: v.prior,
      rawName: v.rawName,
    }))
    .filter((x) => {
      if (x.current <= 0 && x.prior <= 0) return false;
      if (opts?.breakdownBooleans) {
        return isBreakdownShown(opts.breakdownBooleans, x.rawName);
      }
      return true;
    })
    .map((x) => {
      const { rawName, ...rest } = x;
      void rawName;
      return rest;
    })
    .sort((a, b) => b.current + b.prior - (a.current + a.prior))
    .slice(0, 4);
}
 
export async function fetchConversionBreakdownCards(
  supabase: SB,
  clientId: string,
  windows: DateWindow,
  activePairs: ActiveConversionPairIndex,
  platformSlug: string | null,
  opts?: { breakdownBooleans?: ChannelMetricMap },
) {
  const [{ data: allConfigs, error: cfgErr }, { data: clientRow, error: clientErr }] =
    await Promise.all([
      supabase
        .from("client_conversions")
        .select(
          "id, raw_name, platform, display_name, mapped_name, sort_order, is_primary, conversion_type, group_name, is_active",
        )
        .eq("client_id", clientId),
      supabase.from("clients").select("client_type").eq("id", clientId).maybeSingle(),
    ]);
  if (cfgErr) throw cfgErr;
  if (clientErr) throw clientErr;
  const isEcommerceClient = (clientRow?.client_type ?? "").trim().toLowerCase() === "ecommerce";

  const eligibleConfigs = configsForActiveDisplayNames(allConfigs ?? []);
  if (!eligibleConfigs.length) {
    return fetchConversionBreakdownFromEventsOnly(
      supabase,
      clientId,
      windows,
      platformSlug,
      activePairs,
      opts,
    );
  }

  let cfgs = eligibleConfigs as BreakdownCfg[];
  if (platformSlug) {
    cfgs = cfgs.filter((c) => platformSlugMatchesRow(c.platform ?? "", platformSlug));
  }
  const breakdownBooleans = opts?.breakdownBooleans;
  if (breakdownBooleans) {
    cfgs = cfgs.filter((c) => isBreakdownShown(breakdownBooleans, c.raw_name ?? ""));
  }
  if (!cfgs.length) {
    return fetchConversionBreakdownFromEventsOnly(
      supabase,
      clientId,
      windows,
      platformSlug,
      activePairs,
      opts,
    );
  }

  if (isEcommerceClient) {
    const purchaseEventNames = await resolveMetaPurchaseEventNames(supabase, clientId);
    cfgs = appendEcommercePurchaseBreakdownConfigs(cfgs, platformSlug, purchaseEventNames);
  }

  cfgs = normalizeStJamesGooglePurchaseConfigs(cfgs, clientId);

  const sorted = [...cfgs].sort((a, b) => {
    const aPrimary = !!(a.is_active && a.is_primary);
    const bPrimary = !!(b.is_active && b.is_primary);
    if (aPrimary !== bPrimary) return aPrimary ? -1 : 1;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  const rawNamesForQuery = Array.from(
    new Set(cfgs.map((c) => (c.raw_name ?? "").trim()).filter(Boolean)),
  );
  if (rawNamesForQuery.length === 0) return [];
  const allowedRawNames = new Set(rawNamesForQuery);

  const [{ data: convData, error: convErr }, { data: eventData, error: eventErr }] =
    await Promise.all([
      supabase
        .from("campaign_conversion_daily")
        .select("report_date, event_name, platform, conversions, conversion_value")
        .eq("client_id", clientId)
        .in("event_name", rawNamesForQuery)
        .gte("report_date", windows.priorStart)
        .lte("report_date", windows.currentEnd),
      supabase
        .from("conversion_events")
        .select("occurred_on, event_name, platform, event_count")
        .eq("client_id", clientId)
        .in("event_name", rawNamesForQuery)
        .gte("occurred_on", windows.priorStart)
        .lte("occurred_on", windows.currentEnd),
    ]);
  if (convErr) throw convErr;
  if (eventErr) throw eventErr;

  const byPair = new Map<
    string,
    { current: number; prior: number; currentValue: number; priorValue: number }
  >();
  for (const row of eventData ?? []) {
    if (platformSlug && !platformSlugMatchesRow(row.platform ?? "", platformSlug)) continue;
    const eventName = (row.event_name ?? "").trim();
    if (!eventName || !allowedRawNames.has(eventName)) continue;
    const key = activeConversionPairKey(row.platform ?? "", eventName);
    const n = Number(row.event_count ?? 0);
    const agg = byPair.get(key) ?? { current: 0, prior: 0, currentValue: 0, priorValue: 0 };
    if (row.occurred_on >= windows.currentStart) {
      agg.current += n;
    } else if (row.occurred_on >= windows.priorStart && row.occurred_on <= windows.priorEnd) {
      agg.prior += n;
    }
    byPair.set(key, agg);
  }
  for (const row of convData ?? []) {
    if (platformSlug && !platformSlugMatchesRow(row.platform ?? "", platformSlug)) continue;
    const eventName = (row.event_name ?? "").trim();
    if (!eventName || !allowedRawNames.has(eventName)) continue;
    const key = activeConversionPairKey(row.platform ?? "", eventName);
    const value = Number(row.conversion_value ?? 0);
    const convCount = Number(row.conversions ?? 0);
    const useCampaignDailyCounts =
      isStJamesClient(clientId) &&
      isStJamesCombinedGooglePurchaseEvent(eventName) &&
      platformSlugMatchesRow(row.platform ?? "", "google");
    if (!(value > 0) && !(useCampaignDailyCounts && convCount > 0)) continue;
    const agg = byPair.get(key) ?? { current: 0, prior: 0, currentValue: 0, priorValue: 0 };
    if (useCampaignDailyCounts) {
      if (row.report_date >= windows.currentStart) {
        agg.current += convCount;
      } else if (
        row.report_date >= windows.priorStart &&
        row.report_date <= windows.priorEnd
      ) {
        agg.prior += convCount;
      }
    }
    if (value > 0) {
      if (row.report_date >= windows.currentStart) {
        agg.currentValue += value;
      } else if (
        row.report_date >= windows.priorStart &&
        row.report_date <= windows.priorEnd
      ) {
        agg.priorValue += value;
      }
    }
    byPair.set(key, agg);
  }

  const bucketMap = new Map<string, BucketAgg>();

  for (const c of sorted) {
    const pairKey = activeConversionPairKey(c.platform ?? "", c.raw_name);
    const merge = conversionMergeBucket(c);
    const displayKey = conversionDisplayNameKey(c);
    if (!merge && !displayKey) continue;

    const bucketKey = merge ?? `display:${displayKey}`;
    const label = merge
      ? canonicalMergeLabel(merge, c.group_name?.trim() || rowLabel(c))
      : rowLabel(c);
    const so = c.sort_order ?? 999999;

    const prev = bucketMap.get(bucketKey);
    if (!prev) {
      bucketMap.set(bucketKey, {
        bucketKey,
        canonicalLabel: label,
        pairKeys: new Set([pairKey]),
        sortOrderMin: so,
        hasPrimary: !!(c.is_active && c.is_primary),
        bestConfig: c,
      });
      continue;
    }

    prev.pairKeys.add(pairKey);
    prev.hasPrimary = prev.hasPrimary || !!(c.is_active && c.is_primary);
    prev.sortOrderMin = Math.min(prev.sortOrderMin, so);

    const bestSo = prev.bestConfig.sort_order ?? 999999;
    const betterOrder =
      so < bestSo ||
      (so === bestSo && !!(c.is_active && c.is_primary) && !prev.bestConfig.is_primary);
    if (betterOrder) {
      prev.bestConfig = c;
      prev.canonicalLabel = rowLabel(c);
    }
  }
 
  const buckets = Array.from(bucketMap.values()).sort((a, b) => {
    if (isEcommerceClient) {
      return compareConversionBreakdownOrder(
        {
          conversion_type: a.bestConfig.conversion_type,
          sort_order: a.sortOrderMin,
          display_name: a.canonicalLabel,
          raw_name: a.bestConfig.raw_name,
        },
        {
          conversion_type: b.bestConfig.conversion_type,
          sort_order: b.sortOrderMin,
          display_name: b.canonicalLabel,
          raw_name: b.bestConfig.raw_name,
        },
        { ecommerceFunnel: true },
      );
    }
    if (b.hasPrimary !== a.hasPrimary) return a.hasPrimary ? -1 : 1;
    return a.sortOrderMin - b.sortOrderMin;
  });
 
  const topBuckets = buckets.filter((b) => {
    let cur = 0;
    let prior = 0;
    for (const pk of Array.from(b.pairKeys)) {
      const t = byPair.get(pk);
      if (t) {
        cur += t.current;
        prior += t.prior;
      }
    }
    const isPurchaseBucket =
      (b.bestConfig.conversion_type ?? "").trim().toLowerCase() === "purchase";
    const isStJamesPurchaseBucket = b.bucketKey === ST_JAMES_COMBINED_PURCHASE_MERGE_BUCKET;
    if ((isEcommerceClient && isPurchaseBucket) || isStJamesPurchaseBucket) return true;
    return cur > 0 || prior > 0;
  });
 
  // CHANGED: Return conversionValue in addition to conversions
  return topBuckets.map((b) => {
    let cur = 0;
    let prior = 0;
    let curValue = 0;
    let priorValue = 0;
    b.pairKeys.forEach((pk) => {
      const t = byPair.get(pk);
      if (t) {
        cur += t.current;
        prior += t.prior;
        curValue += t.currentValue;
        priorValue += t.priorValue;
      }
    });
    return {
      id: b.bucketKey,
      label: b.canonicalLabel,
      conversionType: b.bestConfig.conversion_type,
      current: cur,
      prior: prior,
      currentValue: curValue,      // NEW
      priorValue: priorValue,       // NEW
    };
  });
}
 
export type PurchaseConversionTotals = {
  current: number;
  prior: number;
  currentValue: number;
  priorValue: number;
  hasPurchaseConversions: boolean;
};

export const LITTLE_CANADIAN_CLIENT_ID = "ce42155a-3b89-4a73-8886-9d7012dbfa05";
export const LITTLE_CANADIAN_CLIENT_SLUG = "little-canadian";

export function isLittleCanadianClient(
  clientId: string,
  clientSlug?: string | null,
): boolean {
  return (
    clientId === LITTLE_CANADIAN_CLIENT_ID ||
    (clientSlug?.trim().toLowerCase() ?? "") === LITTLE_CANADIAN_CLIENT_SLUG
  );
}

export const BACK_CLINICS_CLIENT_ID = "57c8204e-83cc-45cb-ba7f-5cc8f5832024";
export const BACK_CLINICS_CLIENT_SLUG = "back-clinics-of-canada";

export function isBackClinicsClient(
  clientId: string,
  clientSlug?: string | null,
): boolean {
  return (
    clientId === BACK_CLINICS_CLIENT_ID ||
    (clientSlug?.trim().toLowerCase() ?? "") === BACK_CLINICS_CLIENT_SLUG
  );
}

/** Back Clinics overview + Google/Meta/Microsoft YTD: Month, Spend, Conversions, Cost per Conversion. */
export function backClinicsUsesSlimYtdColumns(
  clientId: string,
  clientSlug: string | null | undefined,
  activeView: string,
): boolean {
  if (!isBackClinicsClient(clientId, clientSlug)) return false;
  if (activeView === "overview") return true;
  const slug = canonicalReportPlatformSlug(activeView);
  return slug === "google" || slug === "meta" || slug === "microsoft";
}

export type LittleCanadianHeroPurchaseScope = "overview" | "meta" | "google";

/**
 * Little Canadian hero row 2 — platform-specific purchase sources:
 * Meta purchases from `conversion_events` (`event_name = purchase`); Meta value from `campaign_conversion_daily`.
 * Google purchases + value from `campaign_conversion_daily` (active Google purchase `client_conversions`).
 * Overview combines Meta + Google.
 */
export async function fetchLittleCanadianHeroPurchaseTotals(
  supabase: SB,
  clientId: string,
  windows: DateWindow,
  scope: LittleCanadianHeroPurchaseScope,
): Promise<PurchaseConversionTotals> {
  const includeMeta = scope === "meta" || scope === "overview";
  const includeGoogle = scope === "google" || scope === "overview";

  let current = 0;
  let prior = 0;
  let currentValue = 0;
  let priorValue = 0;

  if (includeMeta) {
    const { data: events, error: eventsErr } = await supabase
      .from("conversion_events")
      .select("occurred_on, event_count, platform")
      .eq("client_id", clientId)
      .eq("event_name", "purchase")
      .gte("occurred_on", windows.priorStart)
      .lte("occurred_on", windows.currentEnd);
    if (eventsErr) throw eventsErr;

    for (const ev of events ?? []) {
      if (!platformSlugMatchesRow(ev.platform ?? "", "meta")) continue;
      const n = Number(ev.event_count ?? 0);
      if (ev.occurred_on >= windows.currentStart) current += n;
      else if (ev.occurred_on >= windows.priorStart && ev.occurred_on <= windows.priorEnd) {
        prior += n;
      }
    }

    const purchaseEventNames = await resolveMetaPurchaseEventNames(supabase, clientId);
    const { data: metaConvDaily, error: metaConvErr } = await supabase
      .from("campaign_conversion_daily")
      .select("report_date, conversion_value, event_name, platform")
      .eq("client_id", clientId)
      .eq("platform", "meta")
      .in("event_name", purchaseEventNames)
      .gte("report_date", windows.priorStart)
      .lte("report_date", windows.currentEnd);
    if (metaConvErr) throw metaConvErr;

    for (const row of metaConvDaily ?? []) {
      const v = Number(row.conversion_value ?? 0);
      if (row.report_date >= windows.currentStart) currentValue += v;
      else if (
        row.report_date >= windows.priorStart &&
        row.report_date <= windows.priorEnd
      ) {
        priorValue += v;
      }
    }
  }

  if (includeGoogle) {
    const googleConvDaily = await fetchGooglePurchaseConversionDailyRows(
      supabase,
      clientId,
      windows.priorStart,
      windows.currentEnd,
    );

    for (const row of googleConvDaily) {
      const n = Number(row.conversions ?? 0);
      const v = Number(row.conversion_value ?? 0);
      const reportDate = row.report_date ?? "";
      if (reportDate >= windows.currentStart) {
        current += n;
        currentValue += v;
      } else if (reportDate >= windows.priorStart && reportDate <= windows.priorEnd) {
        prior += n;
        priorValue += v;
      }
    }
  }

  return {
    current,
    prior,
    currentValue,
    priorValue,
    hasPurchaseConversions: true,
  };
}

export async function fetchPurchaseConversionTotals(
  supabase: SB,
  clientId: string,
  windows: DateWindow,
  activePairs: ActiveConversionPairIndex,
  platformSlug?: string | null,
): Promise<PurchaseConversionTotals> {
  const empty: PurchaseConversionTotals = {
    current: 0,
    prior: 0,
    currentValue: 0,
    priorValue: 0,
    hasPurchaseConversions: false,
  };

  if (isStJamesClient(clientId) && (!platformSlug || platformSlug === "google")) {
    const rawList = [...ST_JAMES_COMBINED_GOOGLE_PURCHASE_EVENTS];
    const { data: convData, error: cErr } = await supabase
      .from("campaign_conversion_daily")
      .select("report_date, event_name, platform, conversions, conversion_value")
      .eq("client_id", clientId)
      .eq("platform", "google")
      .in("event_name", rawList)
      .gte("report_date", windows.priorStart)
      .lte("report_date", windows.currentEnd);
    if (cErr) throw cErr;

    let current = 0;
    let prior = 0;
    let currentValue = 0;
    let priorValue = 0;
    for (const row of convData ?? []) {
      if (!isStJamesCombinedGooglePurchaseEvent(row.event_name)) continue;
      const convCount = Number(row.conversions ?? 0);
      const value = Number(row.conversion_value ?? 0);
      if (row.report_date >= windows.currentStart) {
        current += convCount;
        currentValue += value;
      } else if (
        row.report_date >= windows.priorStart &&
        row.report_date <= windows.priorEnd
      ) {
        prior += convCount;
        priorValue += value;
      }
    }

    return {
      current,
      prior,
      currentValue,
      priorValue,
      hasPurchaseConversions: true,
    };
  }

  const { data: allConfigs, error: cfgErr } = await supabase
    .from("client_conversions")
    .select("raw_name, platform, display_name, mapped_name, is_active, conversion_type")
    .eq("client_id", clientId);
  if (cfgErr) throw cfgErr;

  const eligible = configsForActiveDisplayNames(allConfigs ?? []);
  const purchaseConfigs = eligible.filter((c) => {
    const type = (c.conversion_type ?? "").trim().toLowerCase();
    return type === "purchase";
  });

  const purchasePairKeys = new Set<string>();
  const rawNames = new Set<string>();
  for (const c of purchaseConfigs) {
    if (platformSlug && !platformSlugMatchesRow(c.platform ?? "", platformSlug)) continue;
    const raw = (c.raw_name ?? "").trim();
    if (!raw) continue;
    rawNames.add(raw);
    purchasePairKeys.add(activeConversionPairKey(c.platform ?? "", raw));
  }

  if (purchasePairKeys.size === 0) return empty;

  const rawList = Array.from(rawNames);
  const [{ data: events, error: eErr }, { data: convData, error: cErr }] = await Promise.all([
    supabase
      .from("conversion_events")
      .select("occurred_on, event_count, event_name, platform")
      .eq("client_id", clientId)
      .in("event_name", rawList)
      .gte("occurred_on", windows.priorStart)
      .lte("occurred_on", windows.currentEnd),
    supabase
      .from("campaign_conversion_daily")
      .select("report_date, event_name, platform, conversion_value")
      .eq("client_id", clientId)
      .in("event_name", rawList)
      .gte("report_date", windows.priorStart)
      .lte("report_date", windows.currentEnd),
  ]);
  if (eErr) throw eErr;
  if (cErr) throw cErr;

  let current = 0;
  let prior = 0;
  let currentValue = 0;
  let priorValue = 0;

  for (const ev of events ?? []) {
    const key = activeConversionPairKey(ev.platform ?? "", ev.event_name ?? "");
    if (!purchasePairKeys.has(key) || !activePairs.pairSet.has(key)) continue;
    const n = Number(ev.event_count ?? 0);
    if (ev.occurred_on >= windows.currentStart) current += n;
    else if (ev.occurred_on >= windows.priorStart && ev.occurred_on <= windows.priorEnd) {
      prior += n;
    }
  }

  for (const row of convData ?? []) {
    const key = activeConversionPairKey(row.platform ?? "", row.event_name ?? "");
    if (!purchasePairKeys.has(key) || !activePairs.pairSet.has(key)) continue;
    const value = Number(row.conversion_value ?? 0);
    if (!(value > 0)) continue;
    if (row.report_date >= windows.currentStart) currentValue += value;
    else if (row.report_date >= windows.priorStart && row.report_date <= windows.priorEnd) {
      priorValue += value;
    }
  }

  return {
    current,
    prior,
    currentValue,
    priorValue,
    hasPurchaseConversions: true,
  };
}

export async function fetchConfiguredConversionTotals(
  supabase: SB,
  clientId: string,
  windows: DateWindow,
  pairs: ActiveConversionPairIndex,
) {
  if (pairs.rawNames.length === 0) return { current: 0, prior: 0 };
 
  const { data: events, error: eErr } = await supabase
    .from("conversion_events")
    .select("occurred_on, event_count, event_name, platform")
    .eq("client_id", clientId)
    .in("event_name", pairs.rawNames)
    .gte("occurred_on", windows.priorStart)
    .lte("occurred_on", windows.currentEnd);
  if (eErr) throw eErr;
 
  let current = 0;
  let prior = 0;
  for (const ev of events ?? []) {
    const key = activeConversionPairKey(ev.platform ?? "", ev.event_name ?? "");
    if (!pairs.pairSet.has(key)) continue;
    const count = Number(ev.event_count ?? 0);
    if (ev.occurred_on >= windows.currentStart) current += count;
    else if (ev.occurred_on >= windows.priorStart && ev.occurred_on <= windows.priorEnd) prior += count;
  }
  return { current, prior };
}
 
export function buildHeroStats(
  currentRows: DailyPerfRow[],
  priorRows: DailyPerfRow[],
  currentConversions: number,
  priorConversions: number,
): KpiStat[] {
  const currentSpend = currentRows.reduce((sum, r) => sum + (r.spend_cents ?? 0), 0) / 100;
  const priorSpend = priorRows.reduce((sum, r) => sum + (r.spend_cents ?? 0), 0) / 100;
  const currentCpl = currentConversions > 0 ? currentSpend / currentConversions : 0;
  const priorCpl = priorConversions > 0 ? priorSpend / priorConversions : 0;
  return [
    { label: "Total Spend", current: currentSpend, prior: priorSpend, format: "currency" },
    { label: "Total Conversions", current: currentConversions, prior: priorConversions, format: "number" },
    { label: "Cost per Conversion", current: currentCpl, prior: priorCpl, format: "currency" },
  ];
}
 
export function buildChartData(rows: DailyPerfRow[], start: string, end: string): ReportSeriesPoint[] {
  const byDate = new Map<
    string,
    { spend: number; conversions: number; impressions: number; clicks: number }
  >();
  for (const row of rows) {
    const entry =
      byDate.get(row.report_date) ?? {
        spend: 0,
        conversions: 0,
        impressions: 0,
        clicks: 0,
      };
    entry.spend += (row.spend_cents ?? 0) / 100;
    entry.conversions += Number(row.conversions ?? 0);
    entry.impressions += Number(row.impressions ?? 0);
    entry.clicks += Number(row.clicks ?? 0);
    byDate.set(row.report_date, entry);
  }
 
  const data: ReportSeriesPoint[] = [];
  const d = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);
  while (d <= endDate) {
    const iso = isoDate(d);
    const entry =
      byDate.get(iso) ?? { spend: 0, conversions: 0, impressions: 0, clicks: 0 };
    data.push({
      date: iso,
      cost: round2(entry.spend),
      conversions: round2(entry.conversions),
      cpl: entry.conversions > 0 ? round2(entry.spend / entry.conversions) : 0,
      impressions: round2(entry.impressions),
      clicks: round2(entry.clicks),
      cpc: entry.clicks > 0 ? round2(entry.spend / entry.clicks) : 0,
    });
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return data;
}
 
export function buildChannelSummary(
  rows: DailyPerfRow[],
  conversionsByDisplay: Map<string, number>,
): ChannelSummary[] {
  const byPlatform = new Map<string, { spend: number }>();
  for (const row of rows) {
    const platform = displayPlatformLabel(row.platform);
    const agg = byPlatform.get(platform) ?? { spend: 0 };
    agg.spend += (row.spend_cents ?? 0) / 100;
    byPlatform.set(platform, agg);
  }
  return Array.from(byPlatform.entries())
    .map(([name, agg]) => ({
      name,
      spend: round2(agg.spend),
      conversions: Math.round(conversionsByDisplay.get(name) ?? 0),
    }))
    .sort((a, b) => b.spend - a.spend);
}
 
function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
 
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}