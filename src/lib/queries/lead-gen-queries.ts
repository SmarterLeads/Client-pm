import type { SupabaseClient } from "@supabase/supabase-js";

import {
  marketingDashboardStatuses,
} from "@/lib/marketing/client-status";

import {
  buildConversionPairIndex,
  compareConversionBreakdownOrder,
  configsForActiveDisplayNames,
  conversionDisplayLabel,
  conversionDisplayNameKey,
} from "@/lib/conversions/conversion-scope";
import {
  diffDaysInclusiveWindow,
  getComparisonWindowsUTC,
  getSevenDayWindowsUTC,
  isDateInRangeInclusive,
  type DateRangeInput,
  type DateRangePreset,
} from "@/lib/lead-gen/date-windows";
import {
  aggregateSearchLostIsFromDailyRows,
  type SearchLostIsRollup,
} from "@/lib/lead-gen/search-lost-is";
import type {
  DashboardClientType,
  DashboardDateRangeState,
} from "@/lib/queries/lead-gen-query-keys";
import type { Database, Json } from "@/lib/types/database";
import type {
  ConversionBreakdownGroup,
  KpiDatum,
  PrimaryMetric,
} from "@/lib/marketing/lead-gen-types";
import { MAX_ROW_PRIMARY_SLOTS, mergeChannelMetricRows, type ChartModeValue, type ChannelMetricMap } from "@/lib/report/channel-metric-config";
import {
  activeConversionPairKey,
  canonicalReportPlatformSlug,
  fetchCampaignPerformanceRows,
  fetchDistinctDailyPerformancePlatforms,
  resolveMetaPurchaseEventNames,
  type CampaignTableRow,
} from "@/lib/report/report-tab-platform";
import {
  effectiveAdsBudgetSumCents,
  effectiveBudgetCentsForPlatformKey,
  effectiveLegacyTotalRowCents,
  type MonthlyBudgetYmRow,
} from "@/lib/settings/client-budget-utils";
import { normalizeConversionType } from "@/lib/marketing/lead-gen-types";

type SB = SupabaseClient<Database>;

export type DashboardQueryRangeOptions = Pick<
  DashboardDateRangeState,
  "preset" | "customStart" | "customEnd" | "comparison"
>;

function resolveDateRangeInput(
  options?: Pick<DashboardQueryRangeOptions, "preset" | "customStart" | "customEnd">,
): DateRangePreset | DateRangeInput {
  if (options?.preset === "custom" && options.customStart && options.customEnd) {
    return { kind: "custom", start: options.customStart, end: options.customEnd };
  }
  const preset = options?.preset ?? "last_30";
  if (preset === "custom") return "last_30";
  return preset;
}

function resolveComparisonWindows(options?: DashboardQueryRangeOptions) {
  const comparison = options?.comparison ?? "prior_period";
  return getComparisonWindowsUTC(resolveDateRangeInput(options), comparison);
}

const TAB_ORDER = ["google", "meta", "microsoft", "linkedin", "ghl"] as const;
export type PlatformTab = (typeof TAB_ORDER)[number];

export type PlatformTotals = {
  spendCents: number;
  impressions: number;
  clicks: number;
  conversions: number;
};

export type HeroSeriesDatum = {
  reportDate: string;
  cost: number;
  conversions: number;
  costPerConversion: number;
  impressions: number;
  clicks: number;
  cpc: number;
};

export type PlatformBudgetPacingRow = {
  platform: string;
  budgetCents: number;
  spentToDateCents: number;
  projectedMonthEndCents: number;
  daysElapsed: number;
  daysRemaining: number;
  totalDaysInMonth: number;
};

function formatUsdFromCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function wowPct(current: number, prior: number) {
  if (prior === 0) return current === 0 ? 0 : 100;
  return ((current - prior) / prior) * 100;
}

function formatWowLabel(pct: number) {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function buildLostIsKpis(current: SearchLostIsRollup, prior: SearchLostIsRollup): KpiDatum[] {
  const build = (label: string, cur: number, prv: number): KpiDatum => {
    const pct = wowPct(cur, prv);
    return {
      label,
      value: cur,
      metricType: "percent",
      delta: formatWowLabel(pct),
      deltaPositive: pct <= 0,
      lowerIsBetter: true,
    };
  };
  return [
    build("Lost IS (Rank)", current.searchLostRankAvg, prior.searchLostRankAvg),
    build("Lost IS (Budget)", current.searchLostBudgetAvg, prior.searchLostBudgetAvg),
  ];
}

type DailyRow = {
  report_date: string;
  impressions: number;
  clicks: number;
  spend_cents: number;
  conversions: number;
  conversion_value_cents?: number | null;
  roas?: number | null;
  search_lost_rank?: number | null;
  search_lost_budget?: number | null;
};

type DailyRowMeta = DailyRow & { raw: Json | null };

function readMetaRaw(raw: unknown): { reach: number; lpv: number } {
  let obj: unknown = raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      obj = JSON.parse(raw) as unknown;
    } catch {
      return { reach: 0, lpv: 0 };
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return { reach: 0, lpv: 0 };
  }
  const o = obj as Record<string, unknown>;
  const reach = typeof o.reach === "number" ? o.reach : Number(o.reach) || 0;
  const lpv =
    typeof o.landing_page_views === "number"
      ? o.landing_page_views
      : Number(o.landing_page_views) || 0;
  return { reach: Math.round(reach), lpv: Math.round(lpv) };
}

function sumWindowMeta(rows: DailyRowMeta[], start: string, end: string) {
  return rows
    .filter((r) => isDateInRangeInclusive(r.report_date, start, end))
    .reduce(
      (acc, r) => {
        const { reach, lpv } = readMetaRaw(r.raw);
        return {
          impressions: acc.impressions + (r.impressions ?? 0),
          spend_cents: acc.spend_cents + (r.spend_cents ?? 0),
          conversions: acc.conversions + Number(r.conversions as number),
          reach: acc.reach + reach,
          landingPageViews: acc.landingPageViews + lpv,
        };
      },
      {
        impressions: 0,
        spend_cents: 0,
        conversions: 0,
        reach: 0,
        landingPageViews: 0,
      },
    );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatMetricValue(
  value: number,
  metricType: "number" | "percent" | "currency",
): string {
  if (metricType === "currency") {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (metricType === "percent") {
    return `${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}%`;
  }
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function sumWindow(rows: DailyRow[], start: string, end: string) {
  return rows
    .filter((r) => isDateInRangeInclusive(r.report_date, start, end))
    .reduce(
      (acc, r) => ({
        impressions: acc.impressions + (r.impressions ?? 0),
        clicks: acc.clicks + (r.clicks ?? 0),
        spend_cents: acc.spend_cents + (r.spend_cents ?? 0),
        conversions: acc.conversions + Number(r.conversions as number),
      }),
      { impressions: 0, clicks: 0, spend_cents: 0, conversions: 0 },
    );
}

/** PM team members see all agencies (shared Supabase project, internal staff). */
export async function fetchAgencies(supabase: SB, _userId?: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("agencies")
    .select("id, name")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

/**
 * Agencies the user can access that have at least one active client of `clientType`.
 */
export async function fetchAgenciesForClientType(
  supabase: SB,
  clientType: DashboardClientType,
  includePaused = false,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: memberships, error: mErr } = await supabase
    .from("user_agencies")
    .select("agency_id")
    .eq("user_id", user.id);
  if (mErr) throw mErr;
  const allowed = new Set((memberships ?? []).map((m) => m.agency_id));
  if (allowed.size === 0) return [];

  const statuses = marketingDashboardStatuses(includePaused);
  const { data: clientRows, error: cErr } = await supabase
    .from("clients")
    .select("agency_id")
    .eq("client_type", clientType)
    .in("status", statuses);
  if (cErr) throw cErr;

  const withType = new Set<string>();
  for (const r of clientRows ?? []) {
    if (r.agency_id && allowed.has(r.agency_id)) withType.add(r.agency_id);
  }
  if (withType.size === 0) return [];

  const { data, error } = await supabase
    .from("agencies")
    .select("id, name")
    .in("id", Array.from(withType))
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchAgencyClientTypeAvailability(
  supabase: SB,
  agencyId: string,
  includePaused = false,
): Promise<{ hasLeadGen: boolean; hasEcommerce: boolean }> {
  const statuses = marketingDashboardStatuses(includePaused);
  const { data, error } = await supabase
    .from("clients")
    .select("client_type")
    .eq("agency_id", agencyId)
    .in("status", statuses);
  if (error) throw error;
  const types = new Set((data ?? []).map((r) => r.client_type));
  return {
    hasLeadGen: types.has("lead_gen"),
    hasEcommerce: types.has("ecommerce"),
  };
}

function isMissingLeadQualityScoreColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  const message = String(e.message ?? "").toLowerCase();
  if (e.code === "42703") return true;
  return (
    message.includes("lead_quality_score") &&
    (message.includes("does not exist") || message.includes("undefined column"))
  );
}

/** Normalizes client list rows so `lead_quality_score` is always `number | null` (never undefined). */
function withLeadQualityScoreDefault<
  T extends {
    id: string;
    name: string;
    agency_id: string;
    client_type: string;
    lead_quality_score?: number | null;
  },
>(rows: T[]) {
  return rows.map((r) => ({
    ...r,
    lead_quality_score: r.lead_quality_score ?? null,
  }));
}

export async function fetchClientsForAgency(
  supabase: SB,
  agencyId: string,
  clientType: DashboardClientType,
  includePaused = false,
) {
  const statuses = marketingDashboardStatuses(includePaused);
  const runFull = () =>
    supabase
      .from("clients")
      .select("id, name, agency_id, client_type, lead_quality_score, status")
      .eq("agency_id", agencyId)
      .eq("client_type", clientType)
      .in("status", statuses)
      .order("name");

  const runWithoutScore = () =>
    supabase
      .from("clients")
      .select("id, name, agency_id, client_type, status")
      .eq("agency_id", agencyId)
      .eq("client_type", clientType)
      .in("status", statuses)
      .order("name");

  const { data, error } = await runFull();

  if (error && isMissingLeadQualityScoreColumn(error)) {
    const retry = await runWithoutScore();
    if (retry.error) throw retry.error;
    return withLeadQualityScoreDefault(retry.data ?? []);
  }

  if (error) throw error;
  return withLeadQualityScoreDefault(data ?? []);
}

function internalDashboardTabSlug(raw: string | null | undefined): PlatformTab | null {
  const slug = canonicalReportPlatformSlug(raw);
  if (slug && (TAB_ORDER as readonly string[]).includes(slug)) {
    return slug as PlatformTab;
  }
  const compact = (raw ?? "").trim().toLowerCase();
  if ((TAB_ORDER as readonly string[]).includes(compact)) {
    return compact as PlatformTab;
  }
  return null;
}

export async function fetchClientPlatforms(
  supabase: SB,
  clientId: string,
): Promise<PlatformTab[]> {
  const [{ data: pc }, perfPlatforms] = await Promise.all([
    supabase.from("platform_connections").select("platform").eq("client_id", clientId),
    fetchDistinctDailyPerformancePlatforms(supabase, clientId),
  ]);

  const slugSet = new Set<PlatformTab>();
  for (const raw of [
    ...(pc ?? []).map((r) => r.platform),
    ...perfPlatforms,
  ]) {
    const slug = internalDashboardTabSlug(raw);
    if (slug) slugSet.add(slug);
  }

  return TAB_ORDER.filter((p) => slugSet.has(p));
}

export async function fetchPrimaryMetrics(
  supabase: SB,
  clientId: string,
  options?: DashboardQueryRangeOptions,
): Promise<PrimaryMetric[]> {
  const { data: rows, error } = await supabase
    .from("client_conversions")
    .select(
      "id, raw_name, mapped_name, display_name, platform, sort_order, is_primary, is_active",
    )
    .eq("client_id", clientId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  const eligible = configsForActiveDisplayNames(rows ?? []);
  if (eligible.length === 0) return [];

  const pairIndex = buildConversionPairIndex(eligible);
  if (pairIndex.rawNames.length === 0) return [];

  const win = resolveComparisonWindows(options);

  const { data: events, error: eErr } = await supabase
    .from("conversion_events")
    .select("event_name, event_count, occurred_on, platform")
    .eq("client_id", clientId)
    .in("event_name", pairIndex.rawNames)
    .gte("occurred_on", win.queryStart)
    .lt("occurred_on", win.queryEndExclusive);

  if (eErr) throw eErr;

  const totalsCurrent = new Map<string, number>();
  const totalsPrior = new Map<string, number>();
  for (const ev of events ?? []) {
    const pairKey = activeConversionPairKey(ev.platform ?? "", ev.event_name ?? "");
    if (!pairIndex.pairSet.has(pairKey)) continue;
    const n = ev.event_count ?? 0;
    if (isDateInRangeInclusive(ev.occurred_on, win.currentStart, win.currentEnd)) {
      totalsCurrent.set(pairKey, (totalsCurrent.get(pairKey) ?? 0) + n);
    }
    if (isDateInRangeInclusive(ev.occurred_on, win.priorStart, win.priorEnd)) {
      totalsPrior.set(pairKey, (totalsPrior.get(pairKey) ?? 0) + n);
    }
  }

  type DisplayGroup = {
    id: string;
    label: string;
    isPrimary: boolean;
    pairKeys: Set<string>;
  };

  const groups = new Map<string, DisplayGroup>();
  for (const row of eligible) {
    const key = conversionDisplayNameKey(row);
    const raw = row.raw_name?.trim();
    if (!key || !raw) continue;

    const pairKey = activeConversionPairKey(row.platform ?? "", raw);
    const existing = groups.get(key);
    if (existing) {
      existing.pairKeys.add(pairKey);
      if (row.is_active && row.is_primary) existing.isPrimary = true;
    } else {
      groups.set(key, {
        id: row.id,
        label: conversionDisplayLabel(row),
        isPrimary: !!(row.is_active && row.is_primary),
        pairKeys: new Set([pairKey]),
      });
    }
  }

  const sumPairs = (pairKeys: Set<string>, totals: Map<string, number>) =>
    Array.from(pairKeys).reduce((sum, pk) => sum + (totals.get(pk) ?? 0), 0);

  const scored = Array.from(groups.values()).map((group) => {
    const value = sumPairs(group.pairKeys, totalsCurrent);
    const priorValue = sumPairs(group.pairKeys, totalsPrior);
    return {
      id: group.id,
      label: group.label,
      value,
      priorValue,
      wowPct: wowPct(value, priorValue),
      isPrimary: group.isPrimary,
    };
  });

  const primaries = scored
    .filter((g) => g.isPrimary)
    .sort((a, b) => b.value - a.value);
  const others = scored
    .filter((g) => !g.isPrimary)
    .sort((a, b) => b.value - a.value);

  const ordered =
    primaries.length > 0
      ? [...primaries, ...others]
      : [...scored].sort((a, b) => b.value - a.value);

  return ordered.slice(0, MAX_ROW_PRIMARY_SLOTS).map((row) => ({
    id: row.id,
    label: row.label,
    value: row.value,
    wowPct: row.wowPct,
    priorValue: row.priorValue,
  }));
}

async function fetchMetaEcommercePurchaseValueTotals(
  supabase: SB,
  clientId: string,
  win: ReturnType<typeof resolveComparisonWindows>,
): Promise<{ lastVal: number; priorVal: number }> {
  const purchaseEventNames = await resolveMetaPurchaseEventNames(supabase, clientId);
  const { data: convDaily, error: convErr } = await supabase
    .from("campaign_conversion_daily")
    .select("report_date, conversion_value, event_name, platform")
    .eq("client_id", clientId)
    .eq("platform", "meta")
    .in("event_name", purchaseEventNames)
    .gte("report_date", win.priorStart)
    .lte("report_date", win.currentEnd);
  if (convErr) throw convErr;

  let lastVal = 0;
  let priorVal = 0;
  for (const row of convDaily ?? []) {
    const v = Number(row.conversion_value ?? 0);
    if (isDateInRangeInclusive(row.report_date, win.currentStart, win.currentEnd)) {
      lastVal += v;
    } else if (isDateInRangeInclusive(row.report_date, win.priorStart, win.priorEnd)) {
      priorVal += v;
    }
  }

  console.log(`[fetchEcommerceDailyKpis] meta purchase value clientId=${clientId}`, {
    purchaseEventNames,
    platform: "meta",
    rowCount: convDaily?.length ?? 0,
    lastVal,
    priorVal,
    rawPurchaseValueRows: convDaily,
  });

  return { lastVal, priorVal };
}

export async function fetchEcommercePrimaryMetrics(
  supabase: SB,
  clientId: string,
  options?: DashboardQueryRangeOptions,
): Promise<PrimaryMetric[]> {
  const win = resolveComparisonWindows(options);
  const { data, error } = await supabase
    .from("daily_performance")
    .select("report_date, spend_cents, conversions, conversion_value_cents, roas")
    .eq("client_id", clientId)
    .gte("report_date", win.queryStart)
    .lt("report_date", win.queryEndExclusive);

  if (error) throw error;
  const rows = data ?? [];
  const inCurrent = (r: { report_date: string }) =>
    isDateInRangeInclusive(r.report_date, win.currentStart, win.currentEnd);
  const inPrior = (r: { report_date: string }) =>
    isDateInRangeInclusive(r.report_date, win.priorStart, win.priorEnd);

  let lastPurchases = 0;
  let priorPurchases = 0;
  let lastValue = 0;
  let priorValue = 0;
  let lastSpend = 0;
  let priorSpend = 0;
  for (const r of rows) {
    if (inCurrent(r)) {
      lastPurchases += Number(r.conversions ?? 0);
      lastValue += Number(r.conversion_value_cents ?? 0);
      lastSpend += (r.spend_cents ?? 0) / 100;
    }
    if (inPrior(r)) {
      priorPurchases += Number(r.conversions ?? 0);
      priorValue += Number(r.conversion_value_cents ?? 0);
      priorSpend += (r.spend_cents ?? 0) / 100;
    }
  }
  const lastRoas = lastSpend > 0 ? round2(lastValue / lastSpend) : 0;
  const priorRoas = priorSpend > 0 ? round2(priorValue / priorSpend) : 0;
  const lastAov = lastPurchases > 0 ? round2(lastValue / lastPurchases) : 0;
  const priorAov = priorPurchases > 0 ? round2(priorValue / priorPurchases) : 0;

  return [
    {
      id: "ecom-purchase-value",
      label: "Purchase value",
      value: lastValue,
      wowPct: wowPct(lastValue, priorValue),
      priorValue: priorValue,
      valueKind: "currency" as const,
    },
    {
      id: "ecom-roas",
      label: "ROAS",
      value: lastRoas,
      wowPct: wowPct(lastRoas, priorRoas),
      priorValue: priorRoas,
      valueKind: "ratio" as const,
    },
    {
      id: "ecom-aov",
      label: "Avg order value",
      value: lastAov,
      wowPct: wowPct(lastAov, priorAov),
      priorValue: priorAov,
      valueKind: "currency" as const,
    },
  ];
}

export async function fetchPrimaryMetricsForView(
  supabase: SB,
  clientId: string,
  clientType: DashboardClientType,
  options?: DashboardQueryRangeOptions,
): Promise<PrimaryMetric[]> {
  if (clientType === "ecommerce") {
    return fetchEcommercePrimaryMetrics(supabase, clientId, options);
  }
  return fetchPrimaryMetrics(supabase, clientId, options);
}

export async function fetchSpendAndBudgetCap(
  supabase: SB,
  clientId: string,
  platform: string = "total",
) {
  const p = platform.trim().toLowerCase() || "total";
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  const dayOfMonth = now.getUTCDate();
  const totalDaysInMonth = daysInUtcMonth(y, m);
  const daysElapsed = Math.max(1, dayOfMonth);
  const monthStart = `${y}-${String(m).padStart(2, "0")}-01`;
  const today = isoUtcDate(now);

  let perfQuery = supabase
    .from("daily_performance")
    .select("report_date, spend_cents")
    .eq("client_id", clientId)
    .gte("report_date", monthStart)
    .lte("report_date", today);
  if (p !== "total") {
    perfQuery = perfQuery.eq("platform", p);
  }
  const { data: perf, error: pErr } = await perfQuery;

  if (pErr) throw pErr;

  const totalSpendCents = (perf ?? []).reduce(
    (s, r) => s + (r.spend_cents ?? 0),
    0,
  );

  const { data: allBudgetRows, error: allBudgetErr } = await supabase
    .from("monthly_budgets")
    .select("year, month, platform, budget_amount_cents")
    .eq("client_id", clientId);
  if (allBudgetErr) throw allBudgetErr;

  const ymRows = (allBudgetRows ?? []) as MonthlyBudgetYmRow[];

  let budgetCapCents = 0;
  if (p === "total") {
    const adsSum = effectiveAdsBudgetSumCents(ymRows, y, m);
    const totalRowCents = effectiveLegacyTotalRowCents(ymRows, y, m);
    budgetCapCents = adsSum > 0 ? adsSum : totalRowCents;
  } else {
    budgetCapCents = effectiveBudgetCentsForPlatformKey(ymRows, p, y, m);
  }

  return {
    totalSpendCents,
    daysElapsed,
    totalDaysInMonth,
    /** When no monthly row, show pacing against spend-only heuristic */
    budgetCapCents: budgetCapCents > 0 ? budgetCapCents : Math.max(totalSpendCents, 1),
  };
}

export async function fetchClientHasAlert(supabase: SB, clientId: string) {
  const win = getSevenDayWindowsUTC();
  const { data, error } = await supabase
    .from("sync_log")
    .select("id")
    .eq("client_id", clientId)
    .eq("status", "failed")
    .gte("started_at", `${win.prior7Start}T00:00:00.000Z`)
    .limit(1);

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function fetchShowUnconfiguredBanner(supabase: SB, clientId: string) {
  const { data, error } = await supabase
    .from("client_conversions")
    .select("id")
    .eq("client_id", clientId)
    .eq("is_active", false)
    .eq("status", "new")
    .limit(1);

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function fetchPlatformTotals(
  supabase: SB,
  clientId: string,
  platforms: string[],
  options?: DashboardQueryRangeOptions,
): Promise<PlatformTotals> {
  const win = resolveComparisonWindows(options);
  const normalized = Array.from(
    new Set(platforms.map((p) => p.trim().toLowerCase()).filter(Boolean)),
  );
  if (normalized.length === 0) {
    return {
      spendCents: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
    };
  }
  const { data, error } = await supabase
    .from("daily_performance")
    .select("report_date, impressions, clicks, spend_cents, conversions, platform")
    .eq("client_id", clientId)
    .in("platform", normalized)
    .gte("report_date", win.currentStart)
    .lt("report_date", win.queryEndExclusive);
  if (error) throw error;
  return (data ?? [])
    .filter((r) => isDateInRangeInclusive(r.report_date, win.currentStart, win.currentEnd))
    .reduce(
    (acc, r) => ({
      spendCents: acc.spendCents + (r.spend_cents ?? 0),
      impressions: acc.impressions + (r.impressions ?? 0),
      clicks: acc.clicks + (r.clicks ?? 0),
      conversions: acc.conversions + Number(r.conversions as number),
    }),
    { spendCents: 0, impressions: 0, clicks: 0, conversions: 0 },
  );
}

function isoUtcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysInUtcMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

export async function fetchClientHeroSeries(
  supabase: SB,
  clientId: string,
  platforms: string[],
  options?: DashboardQueryRangeOptions,
): Promise<HeroSeriesDatum[]> {
  const normalized = Array.from(new Set(platforms.map((p) => p.trim().toLowerCase()).filter(Boolean)));
  if (normalized.length === 0) return [];

  const win = resolveComparisonWindows(options);
  const days = Math.max(1, diffDaysInclusiveWindow(win.currentStart, win.currentEnd));
  const startDate = win.currentStart;
  const endDate = win.currentEnd;

  const { data, error } = await supabase
    .from("daily_performance")
    .select("report_date, impressions, clicks, spend_cents, conversions, platform")
    .eq("client_id", clientId)
    .in("platform", normalized)
    .gte("report_date", startDate)
    .lte("report_date", endDate);
  if (error) throw error;

  const byDate = new Map<string, { spendCents: number; impressions: number; clicks: number; conversions: number }>();
  for (const row of data ?? []) {
    const d = row.report_date;
    const cur = byDate.get(d) ?? { spendCents: 0, impressions: 0, clicks: 0, conversions: 0 };
    cur.spendCents += row.spend_cents ?? 0;
    cur.impressions += row.impressions ?? 0;
    cur.clicks += row.clicks ?? 0;
    cur.conversions += Number(row.conversions as number);
    byDate.set(d, cur);
  }

  const series: HeroSeriesDatum[] = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(`${startDate}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + i);
    const iso = isoUtcDate(d);
    const point = byDate.get(iso) ?? { spendCents: 0, impressions: 0, clicks: 0, conversions: 0 };
    const cost = point.spendCents / 100;
    const costPerConversion = point.conversions > 0 ? round2(cost / point.conversions) : 0;
    const cpc = point.clicks > 0 ? round2(cost / point.clicks) : 0;
    series.push({
      reportDate: iso,
      cost: round2(cost),
      conversions: point.conversions,
      costPerConversion,
      impressions: point.impressions,
      clicks: point.clicks,
      cpc,
    });
  }

  return series;
}

export async function fetchPlatformBudgetPacing(
  supabase: SB,
  clientId: string,
  platforms: string[],
): Promise<PlatformBudgetPacingRow[]> {
  const normalized = Array.from(
    new Set(platforms.map((p) => p.trim().toLowerCase()).filter(Boolean)),
  );
  if (normalized.length === 0) return [];

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const dayOfMonth = now.getUTCDate();
  const totalDaysInMonth = daysInUtcMonth(year, month);
  const daysElapsed = Math.max(1, dayOfMonth);
  const daysRemaining = Math.max(0, totalDaysInMonth - dayOfMonth);
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const today = isoUtcDate(now);

  const [{ data: spendRows, error: spendErr }, { data: budgetRows, error: budgetErr }] =
    await Promise.all([
      supabase
        .from("daily_performance")
        .select("platform, spend_cents")
        .eq("client_id", clientId)
        .in("platform", normalized)
        .gte("report_date", monthStart)
        .lte("report_date", today),
      supabase
        .from("monthly_budgets")
        .select("year, month, platform, budget_amount_cents")
        .eq("client_id", clientId),
    ]);

  if (spendErr) throw spendErr;
  if (budgetErr) throw budgetErr;

  const ymm = (budgetRows ?? []) as MonthlyBudgetYmRow[];

  const spendByPlatform = new Map<string, number>();
  for (const r of spendRows ?? []) {
    const p = (r.platform ?? "").trim().toLowerCase();
    if (!p) continue;
    spendByPlatform.set(p, (spendByPlatform.get(p) ?? 0) + (r.spend_cents ?? 0));
  }

  return normalized.map((platform) => {
    const spentToDateCents = spendByPlatform.get(platform) ?? 0;
    const slug = canonicalReportPlatformSlug(platform) ?? platform.trim().toLowerCase();
    const budgetCents = effectiveBudgetCentsForPlatformKey(ymm, slug, year, month);
    const projectedMonthEndCents =
      daysElapsed > 0
        ? Math.round((spentToDateCents / daysElapsed) * totalDaysInMonth)
        : spentToDateCents;

    return {
      platform,
      budgetCents,
      spentToDateCents,
      projectedMonthEndCents,
      daysElapsed,
      daysRemaining,
      totalDaysInMonth,
    };
  });
}

export async function fetchDailyKpis(
  supabase: SB,
  clientId: string,
  platform: string,
  options?: DashboardQueryRangeOptions,
): Promise<KpiDatum[]> {
  const win = resolveComparisonWindows(options);
  const platformKey = platform.trim().toLowerCase();

  let data: DailyRow[] | DailyRowMeta[] | null = null;
  let error: { message: string } | null = null;

  if (platformKey === "meta") {
    const result = await supabase
      .from("daily_performance")
      .select("report_date, impressions, spend_cents, conversions, raw")
      .eq("client_id", clientId)
      .ilike("platform", platform)
      .gte("report_date", win.queryStart)
      .lt("report_date", win.queryEndExclusive);
    data = result.data as DailyRowMeta[] | null;
    error = result.error;
  } else if (platformKey === "google" || platformKey === "microsoft") {
    const result = await supabase
      .from("daily_performance")
      .select(
        "report_date, impressions, clicks, spend_cents, conversions, search_lost_rank, search_lost_budget",
      )
      .eq("client_id", clientId)
      .ilike("platform", platform)
      .gte("report_date", win.queryStart)
      .lt("report_date", win.queryEndExclusive);
    data = result.data as DailyRow[] | null;
    error = result.error;
  } else {
    const result = await supabase
      .from("daily_performance")
      .select("report_date, impressions, clicks, spend_cents, conversions")
      .eq("client_id", clientId)
      .ilike("platform", platform)
      .gte("report_date", win.queryStart)
      .lt("report_date", win.queryEndExclusive);
    data = result.data as DailyRow[] | null;
    error = result.error;
  }

  if (error) throw error;

  const build = (
    label: string,
    cur: number,
    prv: number,
    metricType: "number" | "percent" | "currency" = "number",
  ): KpiDatum => {
    const pct = wowPct(cur, prv);
    const priorLabel = formatMetricValue(prv, metricType);
    return {
      label,
      value: cur,
      metricType,
      delta: `${formatWowLabel(pct)} | Prev: ${priorLabel}`,
      deltaPositive: pct >= 0,
    };
  };

  if (platformKey === "meta") {
    const rows = (data ?? []) as DailyRowMeta[];
    const last = sumWindowMeta(rows, win.currentStart, win.currentEnd);
    const prior = sumWindowMeta(rows, win.priorStart, win.priorEnd);

    const lastCost = round2((last.spend_cents ?? 0) / 100);
    const priorCost = round2((prior.spend_cents ?? 0) / 100);
    const lastCplpv =
      last.landingPageViews > 0 ? round2(lastCost / last.landingPageViews) : 0;
    const priorCplpv =
      prior.landingPageViews > 0 ? round2(priorCost / prior.landingPageViews) : 0;
    const lastCostPerConv =
      last.conversions > 0 ? round2(lastCost / last.conversions) : 0;
    const priorCostPerConv =
      prior.conversions > 0 ? round2(priorCost / prior.conversions) : 0;

    return [
      build("Impressions", last.impressions, prior.impressions, "number"),
      build("Reach", last.reach, prior.reach, "number"),
      build("Landing page views", last.landingPageViews, prior.landingPageViews, "number"),
      build("CPL", lastCplpv, priorCplpv, "currency"),
      build("Cost", lastCost, priorCost, "currency"),
      build("Total conversions", last.conversions, prior.conversions, "number"),
      build("Cost per conversion", lastCostPerConv, priorCostPerConv, "currency"),
    ];
  }

  const rows = (data ?? []) as DailyRow[];

  const last = sumWindow(rows, win.currentStart, win.currentEnd);
  const prior = sumWindow(rows, win.priorStart, win.priorEnd);

  const lastCost = round2((last.spend_cents ?? 0) / 100);
  const priorCost = round2((prior.spend_cents ?? 0) / 100);
  const lastCpc = last.clicks > 0 ? round2(lastCost / last.clicks) : 0;
  const priorCpc = prior.clicks > 0 ? round2(priorCost / prior.clicks) : 0;
  const lastCostPerConv =
    last.conversions > 0 ? round2(lastCost / last.conversions) : 0;
  const priorCostPerConv =
    prior.conversions > 0 ? round2(priorCost / prior.conversions) : 0;

  const baseKpis = [
    build("Impressions", last.impressions, prior.impressions, "number"),
    build("Clicks", last.clicks, prior.clicks, "number"),
    build("CPC", lastCpc, priorCpc, "currency"),
    build("Cost", lastCost, priorCost, "currency"),
    build("Conversions", last.conversions, prior.conversions, "number"),
    build("Cost / Conversion", lastCostPerConv, priorCostPerConv, "currency"),
  ];

  if (platformKey === "google" || platformKey === "microsoft") {
    const lostCurrent = aggregateSearchLostIsFromDailyRows(
      rows,
      win.currentStart,
      win.currentEnd,
    );
    const lostPrior = aggregateSearchLostIsFromDailyRows(
      rows,
      win.priorStart,
      win.priorEnd,
    );
    return [...baseKpis, ...buildLostIsKpis(lostCurrent, lostPrior)];
  }

  return baseKpis;
}

export async function fetchEcommerceDailyKpis(
  supabase: SB,
  clientId: string,
  platform: string,
  options?: DashboardQueryRangeOptions,
): Promise<KpiDatum[]> {
  const win = resolveComparisonWindows(options);
  const p = platform === "ghl" ? "ghl" : platform;
  const selectCols =
    p === "meta"
      ? "report_date, impressions, spend_cents, conversions, raw, clicks, conversion_value_cents, roas"
      : "report_date, impressions, spend_cents, conversions, raw, clicks, conversion_value_cents, roas";

  const { data, error } = await supabase
    .from("daily_performance")
    .select(selectCols)
    .eq("client_id", clientId)
    .ilike("platform", p)
    .gte("report_date", win.queryStart)
    .lt("report_date", win.queryEndExclusive);

  if (error) throw error;

  const ecomBuild = (
    label: string,
    cur: number,
    prv: number,
    metricType: "number" | "percent" | "currency" = "number",
    displayValue?: string,
  ): KpiDatum => {
    const pct = wowPct(cur, prv);
    const priorLabel = formatMetricValue(prv, metricType);
    return {
      label,
      value: cur,
      metricType,
      displayValue,
      delta: `${formatWowLabel(pct)} | Prev: ${priorLabel}`,
      deltaPositive: pct >= 0,
    };
  };

  if (p === "meta") {
    const rows = (data ?? []) as (DailyRowMeta & { clicks?: number })[];
    const lastM = sumWindowMeta(rows, win.currentStart, win.currentEnd);
    const priorM = sumWindowMeta(rows, win.priorStart, win.priorEnd);
    const clicksLast = rows
      .filter((r) => isDateInRangeInclusive(r.report_date, win.currentStart, win.currentEnd))
      .reduce((s, r) => s + (r.clicks ?? 0), 0);
    const clicksPrior = rows
      .filter((r) => isDateInRangeInclusive(r.report_date, win.priorStart, win.priorEnd))
      .reduce((s, r) => s + (r.clicks ?? 0), 0);
    const lastCost = round2((lastM.spend_cents ?? 0) / 100);
    const priorCost = round2((priorM.spend_cents ?? 0) / 100);
    const lastPurch = lastM.conversions;
    const priorPurch = priorM.conversions;
    const { lastVal, priorVal } = await fetchMetaEcommercePurchaseValueTotals(
      supabase,
      clientId,
      win,
    );
    const lastRoas = lastCost > 0 ? round2(lastVal / lastCost) : 0;
    const priorRoas = priorCost > 0 ? round2(priorVal / priorCost) : 0;
    const lastCpp = lastPurch > 0 ? round2(lastCost / lastPurch) : 0;
    const priorCpp = priorPurch > 0 ? round2(priorCost / priorPurch) : 0;
    const lastAov = lastPurch > 0 ? round2(lastVal / lastPurch) : 0;
    const priorAov = priorPurch > 0 ? round2(priorVal / priorPurch) : 0;
    return [
      ecomBuild("Purchase value", lastVal, priorVal, "currency"),
      {
        label: "ROAS",
        value: lastRoas,
        metricType: "number",
        displayValue: lastVal <= 0 || lastCost <= 0 ? "—" : `${lastRoas.toFixed(2)}x`,
        delta: `${formatWowLabel(wowPct(lastRoas, priorRoas))} | Prev: ${
          priorVal <= 0 || priorCost <= 0 ? "—" : `${priorRoas.toFixed(2)}x`
        }`,
        deltaPositive: lastRoas >= priorRoas,
      },
      {
        label: "Average order value",
        value: lastAov,
        metricType: "currency",
        displayValue: lastPurch <= 0 ? "—" : undefined,
        delta: `${formatWowLabel(wowPct(lastAov, priorAov))} | Prev: ${
          priorPurch <= 0 ? "—" : formatMetricValue(priorAov, "currency")
        }`,
        deltaPositive: lastAov >= priorAov,
      },
      ecomBuild("Impressions", lastM.impressions, priorM.impressions, "number"),
      ecomBuild("Clicks", clicksLast, clicksPrior, "number"),
      ecomBuild("Cost", lastCost, priorCost, "currency"),
      ecomBuild("Purchases", lastPurch, priorPurch, "number"),
      ecomBuild("Cost per purchase", lastCpp, priorCpp, "currency"),
    ];
  }

  const rowsG = (data ?? []) as DailyRow[];
  const last = sumWindow(rowsG, win.currentStart, win.currentEnd);
  const prior = sumWindow(rowsG, win.priorStart, win.priorEnd);
  const lastCost = round2((last.spend_cents ?? 0) / 100);
  const priorCost = round2((prior.spend_cents ?? 0) / 100);
  const lastPurch = last.conversions;
  const priorPurch = prior.conversions;
  const lastVal = rowsG
    .filter((r) => isDateInRangeInclusive(r.report_date, win.currentStart, win.currentEnd))
    .reduce((s, r) => s + Number(r.conversion_value_cents ?? 0), 0);
  const priorVal = rowsG
    .filter((r) => isDateInRangeInclusive(r.report_date, win.priorStart, win.priorEnd))
    .reduce((s, r) => s + Number(r.conversion_value_cents ?? 0), 0);
  const lastRoas = lastCost > 0 ? round2(lastVal / lastCost) : 0;
  const priorRoas = priorCost > 0 ? round2(priorVal / priorCost) : 0;
  const lastCpp = lastPurch > 0 ? round2(lastCost / lastPurch) : 0;
  const priorCpp = priorPurch > 0 ? round2(priorCost / priorPurch) : 0;
  const lastAov = lastPurch > 0 ? round2(lastVal / lastPurch) : 0;
  const priorAov = priorPurch > 0 ? round2(priorVal / priorPurch) : 0;
  return [
    ecomBuild("Purchase value", lastVal, priorVal, "currency"),
    {
      label: "ROAS",
      value: lastRoas,
      metricType: "number",
      displayValue: lastVal <= 0 || lastCost <= 0 ? "—" : `${lastRoas.toFixed(2)}x`,
      delta: `${formatWowLabel(wowPct(lastRoas, priorRoas))} | Prev: ${
        priorVal <= 0 || priorCost <= 0 ? "—" : `${priorRoas.toFixed(2)}x`
      }`,
      deltaPositive: lastRoas >= priorRoas,
    },
    {
      label: "Average order value",
      value: lastAov,
      metricType: "currency",
      displayValue: lastPurch <= 0 ? "—" : undefined,
      delta: `${formatWowLabel(wowPct(lastAov, priorAov))} | Prev: ${
        priorPurch <= 0 ? "—" : formatMetricValue(priorAov, "currency")
      }`,
      deltaPositive: lastAov >= priorAov,
    },
    ecomBuild("Impressions", last.impressions, prior.impressions, "number"),
    ecomBuild("Clicks", last.clicks, prior.clicks, "number"),
    ecomBuild("Cost", lastCost, priorCost, "currency"),
    ecomBuild("Purchases", lastPurch, priorPurch, "number"),
    ecomBuild("Cost per purchase", lastCpp, priorCpp, "currency"),
  ];
}

export async function fetchDailyKpisForView(
  supabase: SB,
  clientId: string,
  platform: string,
  clientType: DashboardClientType,
  options?: DashboardQueryRangeOptions,
): Promise<KpiDatum[]> {
  if (clientType === "ecommerce") {
    if (platform === "ghl") {
      return fetchDailyKpis(supabase, clientId, platform, options);
    }
    return fetchEcommerceDailyKpis(supabase, clientId, platform, options);
  }
  return fetchDailyKpis(supabase, clientId, platform, options);
}

export async function fetchConversionBreakdown(
  supabase: SB,
  clientId: string,
  platform: string,
  options?: DashboardQueryRangeOptions,
): Promise<ConversionBreakdownGroup[]> {
  const win = resolveComparisonWindows(options);

  const configPlatform = platform;
  const eventsPlatform = platform;

  const [{ data: allConfigs, error: cErr }, { data: clientRow, error: clientTypeErr }] =
    await Promise.all([
      supabase
        .from("client_conversions")
        .select(
          "id, raw_name, display_name, mapped_name, group_name, sort_order, conversion_type, is_active, is_primary",
        )
        .eq("client_id", clientId)
        .ilike("platform", configPlatform)
        .order("sort_order", { ascending: true }),
      supabase.from("clients").select("client_type").eq("id", clientId).maybeSingle(),
    ]);

  if (cErr) throw cErr;
  if (clientTypeErr) throw clientTypeErr;
  const isEcommerceClient = (clientRow?.client_type ?? "").trim().toLowerCase() === "ecommerce";
  const eligible = configsForActiveDisplayNames(allConfigs ?? []);
  if (eligible.length === 0) return [];

  const rawNames = Array.from(
    new Set(eligible.map((c) => c.raw_name?.trim()).filter((n): n is string => Boolean(n))),
  );
  if (rawNames.length === 0) return [];

  const [{ data: events, error: eErr }, { data: perfRows, error: pErr }] = await Promise.all([
    supabase
      .from("conversion_events")
      .select("event_name, event_count, occurred_on")
      .eq("client_id", clientId)
      .ilike("platform", eventsPlatform)
      .in("event_name", rawNames)
      .gte("occurred_on", win.queryStart)
      .lt("occurred_on", win.queryEndExclusive),
    supabase
      .from("daily_performance")
      .select("report_date, spend_cents")
      .eq("client_id", clientId)
      .ilike("platform", eventsPlatform)
      .gte("report_date", win.queryStart)
      .lt("report_date", win.queryEndExclusive),
  ]);

  if (eErr) throw eErr;
  if (pErr) throw pErr;

  const totalsCurrent = new Map<string, number>();
  const totalsPrior = new Map<string, number>();
  for (const ev of events ?? []) {
    const k = ev.event_name;
    if (isDateInRangeInclusive(ev.occurred_on, win.currentStart, win.currentEnd)) {
      totalsCurrent.set(k, (totalsCurrent.get(k) ?? 0) + (ev.event_count ?? 0));
    }
    if (isDateInRangeInclusive(ev.occurred_on, win.priorStart, win.priorEnd)) {
      totalsPrior.set(k, (totalsPrior.get(k) ?? 0) + (ev.event_count ?? 0));
    }
  }
  const spendCurrentCents = (perfRows ?? [])
    .filter((r) => isDateInRangeInclusive(r.report_date, win.currentStart, win.currentEnd))
    .reduce((sum, r) => sum + (r.spend_cents ?? 0), 0);

  type DisplayGroup = {
    id: string;
    displayName: string;
    type: ReturnType<typeof normalizeConversionType>;
    sortOrder: number;
    groupName: string;
    rawNames: string[];
  };

  const byDisplayName = new Map<string, DisplayGroup>();
  for (const c of eligible) {
    const key = conversionDisplayNameKey(c);
    const raw = c.raw_name?.trim();
    if (!key || !raw) continue;

    const existing = byDisplayName.get(key);
    if (!existing) {
      byDisplayName.set(key, {
        id: c.id,
        displayName: conversionDisplayLabel(c),
        type: normalizeConversionType(c.conversion_type),
        sortOrder: c.sort_order ?? 0,
        groupName: (c.group_name?.trim() || "General") as string,
        rawNames: [raw],
      });
      continue;
    }

    if (!existing.rawNames.includes(raw)) existing.rawNames.push(raw);
    const sortOrder = c.sort_order ?? 0;
    if (c.is_active && sortOrder <= existing.sortOrder) {
      existing.id = c.id;
      existing.displayName = conversionDisplayLabel(c);
      existing.type = normalizeConversionType(c.conversion_type);
      existing.sortOrder = sortOrder;
      existing.groupName = (c.group_name?.trim() || existing.groupName) as string;
    } else {
      existing.sortOrder = Math.min(existing.sortOrder, sortOrder);
    }
  }

  const sumRawNames = (raws: string[], totals: Map<string, number>) =>
    raws.reduce((sum, rawName) => sum + (totals.get(rawName) ?? 0), 0);

  const enriched = Array.from(byDisplayName.values()).map((g) => {
    const totalCount = sumRawNames(g.rawNames, totalsCurrent);
    const priorCount = sumRawNames(g.rawNames, totalsPrior);
    return {
      id: g.id,
      displayName: g.displayName,
      type: g.type,
      sortOrder: g.sortOrder,
      groupName: g.groupName,
      totalCount,
      priorCount,
      wowPct: wowPct(totalCount, priorCount),
      costPerConv:
        totalCount > 0 ? round2(spendCurrentCents / 100 / totalCount) : 0,
    };
  });

  if (isEcommerceClient) {
    const rows = enriched
      .slice()
      .sort((a, b) =>
        compareConversionBreakdownOrder(
          {
            conversion_type: a.type,
            sort_order: a.sortOrder,
            display_name: a.displayName,
          },
          {
            conversion_type: b.type,
            sort_order: b.sortOrder,
            display_name: b.displayName,
          },
          { ecommerceFunnel: true },
        ),
      )
      .map((r) => ({
        id: r.id,
        displayName: r.displayName,
        type: r.type,
        sortOrder: r.sortOrder,
        totalCount: r.totalCount,
        priorCount: r.priorCount,
        wowPct: r.wowPct,
        costPerConv: r.costPerConv,
      }));

    if (rows.length === 0) return [];
    return [{ groupName: "Conversions", groupOrder: 0, rows }];
  }

  const byGroup = new Map<string, typeof enriched>();
  for (const row of enriched) {
    const g = row.groupName;
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(row);
  }

  const groups: ConversionBreakdownGroup[] = Array.from(byGroup.entries()).map(
    ([groupName, groupRows]) => ({
      groupName,
      groupOrder: Math.min(...groupRows.map((r) => r.sortOrder)),
      rows: groupRows
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((r) => ({
          id: r.id,
          displayName: r.displayName,
          type: r.type,
          sortOrder: r.sortOrder,
          totalCount: r.totalCount,
          priorCount: r.priorCount,
          wowPct: r.wowPct,
          costPerConv: r.costPerConv,
        })),
    }),
  );

  groups.sort((a, b) => a.groupOrder - b.groupOrder);
  return groups;
}

export type GhlMetricGroupCard = {
  title: string;
  metrics: { label: string; value: string; wow?: string }[];
};

export type GhlFunnelStage = { stage: string; count: number };

export type GhlDashboardData = {
  kpis: KpiDatum[];
  groups: GhlMetricGroupCard[];
  funnel: GhlFunnelStage[];
};

function sumSnapshotWindow(
  rows: {
    snapshot_date: string;
    total_contacts: number;
    new_contacts: number;
    opportunities_created: number;
    pipeline_value_cents: number;
  }[],
  start: string,
  end: string,
) {
  return rows
    .filter((r) => isDateInRangeInclusive(r.snapshot_date, start, end))
    .reduce(
      (acc, r) => ({
        total_contacts: acc.total_contacts + (r.total_contacts ?? 0),
        new_contacts: acc.new_contacts + (r.new_contacts ?? 0),
        opportunities_created:
          acc.opportunities_created + (r.opportunities_created ?? 0),
        pipeline_value_cents:
          acc.pipeline_value_cents + (r.pipeline_value_cents ?? 0),
      }),
      {
        total_contacts: 0,
        new_contacts: 0,
        opportunities_created: 0,
        pipeline_value_cents: 0,
      },
    );
}

export async function fetchGhlDashboard(
  supabase: SB,
  clientId: string,
): Promise<GhlDashboardData> {
  const win = getSevenDayWindowsUTC();

  const [dailyKpi, snapsRes, latestRes] = await Promise.all([
    fetchDailyKpis(supabase, clientId, "ghl"),
    supabase
      .from("ghl_daily_snapshot")
      .select(
        "snapshot_date, total_contacts, new_contacts, opportunities_created, pipeline_value_cents",
      )
      .eq("client_id", clientId)
      .gte("snapshot_date", win.prior7Start)
      .lte("snapshot_date", win.last7End),
    supabase
      .from("ghl_pipeline_snapshot")
      .select("snapshot_date")
      .eq("client_id", clientId)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (snapsRes.error) throw snapsRes.error;
  if (latestRes.error) throw latestRes.error;

  const snapRows = snapsRes.data ?? [];
  const lastS = sumSnapshotWindow(snapRows, win.last7Start, win.last7End);
  const priorS = sumSnapshotWindow(snapRows, win.prior7Start, win.prior7End);

  const spendKpi = dailyKpi.find((k) => k.label === "Cost");

  const groups: GhlMetricGroupCard[] = [
    {
      title: "Pipeline health",
      metrics: [
        {
          label: "Pipeline value (7d sum)",
          value: formatUsdFromCents(lastS.pipeline_value_cents),
          wow: formatWowLabel(
            wowPct(lastS.pipeline_value_cents, priorS.pipeline_value_cents),
          ),
        },
        {
          label: "Opportunities created",
          value: lastS.opportunities_created.toLocaleString(),
          wow: formatWowLabel(
            wowPct(lastS.opportunities_created, priorS.opportunities_created),
          ),
        },
        {
          label: "Avg daily pipeline $",
          value: formatUsdFromCents(Math.round(lastS.pipeline_value_cents / 7)),
          wow: formatWowLabel(
            wowPct(
              Math.round(lastS.pipeline_value_cents / 7),
              Math.round(priorS.pipeline_value_cents / 7),
            ),
          ),
        },
      ],
    },
    {
      title: "Contact engine",
      metrics: [
        {
          label: "New contacts (7d)",
          value: lastS.new_contacts.toLocaleString(),
          wow: formatWowLabel(wowPct(lastS.new_contacts, priorS.new_contacts)),
        },
        {
          label: "Total contacts touched (7d)",
          value: lastS.total_contacts.toLocaleString(),
          wow: formatWowLabel(wowPct(lastS.total_contacts, priorS.total_contacts)),
        },
        {
          label: "Net new / day",
          value: (lastS.new_contacts / 7).toFixed(1),
          wow: formatWowLabel(
            wowPct(lastS.new_contacts / 7, priorS.new_contacts / 7),
          ),
        },
      ],
    },
    {
      title: "Appointments & velocity",
      metrics: [
        {
          label: "Opportunities / 1k contacts",
          value:
            lastS.total_contacts > 0
              ? ((lastS.opportunities_created / lastS.total_contacts) * 1000).toFixed(1)
              : "0",
          wow: "—",
        },
        {
          label: "Pipeline / contact",
          value:
            lastS.total_contacts > 0
              ? formatUsdFromCents(
                  Math.round(lastS.pipeline_value_cents / lastS.total_contacts),
                )
              : "—",
          wow: "—",
        },
        {
          label: "Snapshot days in window",
          value: String(
            new Set(
              snapRows
                .filter((r) =>
                  isDateInRangeInclusive(r.snapshot_date, win.last7Start, win.last7End),
                )
                .map((r) => r.snapshot_date),
            ).size,
          ),
          wow: "in last 7d",
        },
      ],
    },
    {
      title: "Attribution overview",
      metrics: [
        {
          label: "Ad spend (7d)",
          value:
            spendKpi?.value != null
              ? spendKpi.value.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : "—",
          wow: spendKpi?.delta,
        },
        {
          label: "Opportunity rate",
          value:
            lastS.total_contacts > 0
              ? `${((lastS.opportunities_created / lastS.total_contacts) * 100).toFixed(1)}%`
              : "0%",
          wow: "opps ÷ contacts",
        },
        {
          label: "New contacts (last / prior 7d)",
          value: `${lastS.new_contacts.toLocaleString()} / ${priorS.new_contacts.toLocaleString()}`,
          wow: formatWowLabel(wowPct(lastS.new_contacts, priorS.new_contacts)),
        },
      ],
    },
  ];

  let funnel: GhlFunnelStage[] = [];
  const latestDate = latestRes.data?.snapshot_date;
  if (latestDate) {
    const { data: stages, error } = await supabase
      .from("ghl_pipeline_snapshot")
      .select("stage_name, opportunity_count")
      .eq("client_id", clientId)
      .eq("snapshot_date", latestDate);

    if (!error && stages?.length) {
      const merged = new Map<string, number>();
      for (const s of stages) {
        const name = s.stage_name?.trim() || "Unspecified";
        merged.set(name, (merged.get(name) ?? 0) + (s.opportunity_count ?? 0));
      }
      funnel = Array.from(merged.entries()).map(([stage, count]) => ({
        stage,
        count,
      }));
      funnel.sort((a, b) => b.count - a.count);
    }
  }

  return { kpis: dailyKpi, groups, funnel };
}

export async function fetchClientChannelMetricBooleans(
  supabase: SB,
  clientId: string,
): Promise<ChannelMetricMap> {
  const [{ data: client, error: cErr }, { data: rows, error: mErr }] = await Promise.all([
    supabase.from("clients").select("default_chart_mode").eq("id", clientId).maybeSingle(),
    supabase.from("client_metric_config").select("metric_key, metric_value").eq("client_id", clientId),
  ]);
  if (cErr) throw cErr;
  if (mErr) throw mErr;
  const chartFallback =
    client?.default_chart_mode === "traffic" ? "traffic" : ("conversions" as ChartModeValue);
  return mergeChannelMetricRows(rows ?? [], chartFallback).booleans;
}

export async function fetchInternalCampaignPerformance(
  supabase: SB,
  clientId: string,
  platform: string,
  options?: DashboardQueryRangeOptions,
): Promise<CampaignTableRow[]> {
  const win = resolveComparisonWindows(options);
  return fetchCampaignPerformanceRows(
    supabase,
    clientId,
    platform,
    win.currentStart,
    win.currentEnd,
  );
}

export type { CampaignTableRow };
