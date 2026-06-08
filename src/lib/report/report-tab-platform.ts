import { isGoogleAdsPlatform } from "@/lib/ad-platforms";
import {
  buildConversionPairIndex,
  configsForActiveDisplayNames,
} from "@/lib/conversions/conversion-scope";
import { parseGhlPipelineConfig } from "@/lib/report/ghl-pipeline-config";
import {
  stJamesCombinedGooglePurchaseEventNames,
} from "@/lib/report/st-james-report-config";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type SB = SupabaseClient<Database>;

export type ReportSeriesPoint = {
  date: string;
  cost: number;
  conversions: number;
  cpl: number;
  impressions: number;
  clicks: number;
  cpc: number;
};

/**
 * Maps DB `platform` strings from connections vs daily_performance onto one slug
 * (e.g. `facebook` → `meta`) so tab discovery and filters stay aligned.
 */
export function canonicalReportPlatformSlug(raw: string | null | undefined): string | null {
  const p = (raw ?? "")
    .replace(/\u00a0/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!p) return null;
  const compact = p.replace(/[\s_-]/g, "");

  if (isGoogleAdsPlatform(p)) return "google";

  if (p === "meta" || p === "facebook" || compact === "facebook" || compact === "metaads" || p === "fb") {
    return "meta";
  }

  if (p === "microsoft" || p === "bing" || compact === "bingads" || compact === "microsoftads") {
    return "microsoft";
  }

  if (p === "tiktok") return "tiktok";
  if (p === "linkedin") return "linkedin";
  if (p === "ghl" || p === "go high level") return "ghl";
  if (p === "whatconverts" || compact === "whatconverts") return "whatconverts";

  return null;
}

export function displayPlatformLabel(platform: string): string {
  const canon = canonicalReportPlatformSlug(platform);
  if (canon === "google") return "Google Ads";
  if (canon === "meta") return "Meta Ads";
  if (canon === "microsoft") return "Microsoft Ads";
  if (canon === "tiktok") return "TikTok Ads";
  if (canon === "linkedin") return "LinkedIn Ads";
  const p = (platform ?? "").trim();
  return p.length > 0 ? p : platform;
}

/**
 * Pairs used to match `conversion_events` to the report (hero totals, breakdown, channel maps).
 * Includes inactive raw_names when their display_name has at least one active config row.
 * If there are no such rows but `conversion_events` exist, infers names from events so Google data
 * still surfaces on the client report.
 */
export async function loadActiveConversionPairIndex(
  supabase: SB,
  clientId: string,
): Promise<ActiveConversionPairIndex> {
  const { data, error } = await supabase
    .from("client_conversions")
    .select("raw_name, platform, display_name, mapped_name, is_active")
    .eq("client_id", clientId);
  if (error) throw error;

  const eligible = configsForActiveDisplayNames(data ?? []);
  const index = buildConversionPairIndex(eligible);

  /** No usable conversion config names — infer from stored events so the report still totals. */
  if (index.rawNames.length === 0) {
    const { data: evRows, error: evErr } = await supabase
      .from("conversion_events")
      .select("event_name, platform")
      .eq("client_id", clientId);
    if (evErr) throw evErr;
    for (const ev of evRows ?? []) {
      const name = (ev.event_name ?? "").trim();
      if (!name) continue;
      index.rawNames.push(name);
      index.pairSet.add(activeConversionPairKey(ev.platform ?? "", name));
    }
    index.rawNames = Array.from(new Set(index.rawNames));
  }

  const { data: clientRow, error: clientErr } = await supabase
    .from("clients")
    .select("client_type")
    .eq("id", clientId)
    .maybeSingle();
  if (clientErr) throw clientErr;
  if ((clientRow?.client_type ?? "").trim().toLowerCase() === "ecommerce") {
    const purchaseNames = await resolveMetaPurchaseEventNames(supabase, clientId);
    for (const raw of purchaseNames) {
      if (!index.rawNames.includes(raw)) index.rawNames.push(raw);
      index.pairSet.add(activeConversionPairKey("meta", raw));
    }
  }

  return index;
}

export async function fetchConversionTotalsByDisplayPlatform(
  supabase: SB,
  clientId: string,
  startDate: string,
  endDate: string,
  pairs: ActiveConversionPairIndex,
): Promise<Map<string, number>> {
  if (pairs.rawNames.length === 0) return new Map();

  const { data: events, error } = await supabase
    .from("conversion_events")
    .select("platform, event_count, event_name")
    .eq("client_id", clientId)
    .in("event_name", pairs.rawNames)
    .gte("occurred_on", startDate)
    .lte("occurred_on", endDate);
  if (error) throw error;

  const byDisplay = new Map<string, number>();
  for (const ev of events ?? []) {
    const key = activeConversionPairKey(ev.platform ?? "", ev.event_name ?? "");
    if (!pairs.pairSet.has(key)) continue;
    const display = displayPlatformLabel(ev.platform ?? "");
    byDisplay.set(display, (byDisplay.get(display) ?? 0) + Number(ev.event_count ?? 0));
  }
  return byDisplay;
}

export type ReportTabSlug = "overview" | string;

export type ReportTabItem = { slug: string; label: string };

const TAB_ORDER = ["google", "meta", "microsoft", "tiktok", "linkedin", "ghl", "whatconverts"] as const;

/** Display label for tab strip (matches product copy). */
export function platformTabLabel(slug: string): string {
  const s = slug.trim().toLowerCase();
  if (s === "google") return "Google Ads";
  if (s === "meta") return "Meta Ads";
  if (s === "microsoft") return "Microsoft Ads";
  if (s === "tiktok") return "TikTok Ads";
  if (s === "linkedin") return "LinkedIn Ads";
  if (s === "ghl") return "GHL";
  if (s === "whatconverts") return "WhatConverts";
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

export function normalizeReportView(input: string | undefined): ReportTabSlug {
  const v = (input ?? "overview").trim().toLowerCase();
  if (v === "overview" || v === "") return "overview";
  if (v === "ghl") return "ghl";
  if (v === "whatconverts") return "whatconverts";
  const slug = canonicalReportPlatformSlug(v);
  return slug ?? v;
}

export function platformSlugMatchesRow(platform: string, slug: string): boolean {
  const rowSlug = canonicalReportPlatformSlug(platform);
  const want = slug.trim().toLowerCase();
  if (rowSlug) return rowSlug === want;
  return (platform ?? "").trim().toLowerCase() === want;
}

/**
 * Distinct raw `platform` values from all `daily_performance` rows for a client.
 * Paginates past the PostgREST default row cap so older Google rows do not hide Meta/Microsoft.
 */
export async function fetchDistinctDailyPerformancePlatforms(
  supabase: SB,
  clientId: string,
): Promise<string[]> {
  const platforms = new Set<string>();
  const pageSize = 1000;
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("daily_performance")
      .select("platform")
      .eq("client_id", clientId)
      .order("platform", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;

    const batch = data ?? [];
    for (const row of batch) {
      const p = (row.platform ?? "").trim();
      if (p) platforms.add(p);
    }
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return Array.from(platforms);
}

function reportTabSlugFromRawPlatform(raw: string | null | undefined): string | null {
  const slug = canonicalReportPlatformSlug(raw);
  if (!slug || slug === "ghl" || slug === "whatconverts") return null;
  return slug;
}

/** Collect distinct report tab slugs from raw DB platform strings (connections + daily_performance). */
export function collectReportTabSlugsFromRawPlatforms(
  rawPlatforms: Array<string | null | undefined>,
): Set<string> {
  const slugSet = new Set<string>();
  for (const raw of rawPlatforms) {
    const slug = reportTabSlugFromRawPlatform(raw);
    if (slug) slugSet.add(slug);
  }
  return slugSet;
}

function sortReportTabSlugs(slugSet: Set<string>): string[] {
  const slugs = Array.from(slugSet);
  slugs.sort((a, b) => {
    const ia = TAB_ORDER.indexOf(a as (typeof TAB_ORDER)[number]);
    const ib = TAB_ORDER.indexOf(b as (typeof TAB_ORDER)[number]);
    const sa = ia === -1 ? 99 : ia;
    const sb = ib === -1 ? 99 : ib;
    if (sa !== sb) return sa - sb;
    return a.localeCompare(b);
  });
  return slugs;
}

async function clientEligibleForGhlReportTab(
  supabase: SB,
  clientId: string,
): Promise<boolean> {
  const [{ data: client, error: clientErr }, { data: conn, error: connErr }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("ghl_pipeline_config")
        .eq("id", clientId)
        .maybeSingle(),
      supabase
        .from("platform_connections")
        .select("id")
        .eq("client_id", clientId)
        .eq("platform", "ghl")
        .in("status", ["connected", "active"])
        .limit(1)
        .maybeSingle(),
    ]);
  if (clientErr) throw clientErr;
  if (connErr) throw connErr;

  if (parseGhlPipelineConfig(client?.ghl_pipeline_config)) return true;
  return Boolean(conn?.id);
}

async function clientEligibleForWhatConvertsReportTab(
  supabase: SB,
  clientId: string,
): Promise<boolean> {
  const { data: client, error } = await supabase
    .from("clients")
    .select("whatconverts_profile_id")
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(client?.whatconverts_profile_id?.trim());
}

/**
 * Tabs for platforms with `daily_performance` data (and active connections when visible via RLS),
 * matching internal dashboard platform discovery.
 */
export async function fetchReportTabPlatforms(supabase: SB, clientId: string): Promise<ReportTabItem[]> {
  const [perfPlatforms, { data: connections, error: connErr }, ghlEligible, whatConvertsEligible] =
    await Promise.all([
    fetchDistinctDailyPerformancePlatforms(supabase, clientId),
    supabase.from("platform_connections").select("platform").eq("client_id", clientId),
    clientEligibleForGhlReportTab(supabase, clientId),
    clientEligibleForWhatConvertsReportTab(supabase, clientId),
  ]);
  if (connErr) throw connErr;

  const slugSet = collectReportTabSlugsFromRawPlatforms([
    ...perfPlatforms,
    ...(connections ?? []).map((row) => row.platform),
  ]);
  if (ghlEligible) slugSet.add("ghl");
  if (whatConvertsEligible) slugSet.add("whatconverts");
  return sortReportTabSlugs(slugSet).map((slug) => ({ slug, label: platformTabLabel(slug) }));
}

/** Rows whose `platform` maps to a slug returned by {@link fetchReportTabPlatforms} for the same client. */
export function filterDailyPerfRowsByTabSlugs<T extends { platform: string }>(
  rows: T[],
  tabSlugs: Set<string>,
): T[] {
  return rows.filter((r) => {
    const s = canonicalReportPlatformSlug(r.platform);
    return s !== null && tabSlugs.has(s);
  });
}

export type DailyPerfRow = {
  report_date: string;
  platform: string;
  spend_cents: number;
  conversions: number;
  impressions: number;
  clicks: number;
};

const CALENDAR_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export type YtdMonthTableRow = {
  monthLabel: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  costPerConversion: number;
  avgCpc: number;
  /** Meta ecommerce YTD — purchase count from campaign-level conversion rows. */
  purchases?: number;
  /** Meta ecommerce YTD — purchase revenue (USD). */
  purchaseValue?: number;
  /** Meta ecommerce YTD — purchaseValue / spend. */
  roas?: number;
  /** True when this calendar month is still in the future relative to `asOfIsoDate` (no metrics yet). */
  isFutureMonth: boolean;
};

/** True when at least one non-future month has non-zero YTD metrics. */
export function ytdMonthRowsHaveMetrics(
  rows: YtdMonthTableRow[],
  options?: {
    useEcommerceColumns?: boolean;
    useHudsonOverviewColumns?: boolean;
    useBackClinicsSlimYtdColumns?: boolean;
  },
): boolean {
  const useHudsonOverviewColumns = options?.useHudsonOverviewColumns === true;
  const useBackClinicsSlimYtdColumns = options?.useBackClinicsSlimYtdColumns === true;
  const useEcommerceColumns = options?.useEcommerceColumns === true;
  for (const r of rows) {
    if (r.isFutureMonth) continue;
    if (useBackClinicsSlimYtdColumns) {
      if (r.spend > 0 || r.conversions > 0) {
        return true;
      }
    } else if (useHudsonOverviewColumns) {
      if (
        r.spend > 0 ||
        r.conversions > 0 ||
        (r.purchases ?? 0) > 0 ||
        (r.purchaseValue ?? 0) > 0
      ) {
        return true;
      }
    } else if (useEcommerceColumns) {
      if (
        r.spend > 0 ||
        (r.purchases ?? 0) > 0 ||
        (r.purchaseValue ?? 0) > 0
      ) {
        return true;
      }
    } else if (
      r.impressions > 0 ||
      r.clicks > 0 ||
      r.spend > 0 ||
      r.conversions > 0
    ) {
      return true;
    }
  }
  return false;
}

export type YtdMonthPurchases = {
  purchases: number;
  purchaseValue: number;
};

export type BuildYtdMonthlyTableRowsOptions = {
  /** YYYY-MM-DD; months strictly after this month show as future (UI dashes). Defaults to today. */
  asOfIsoDate?: string;
  /** Optional monthly purchase metrics (Meta ecommerce). */
  purchasesByMonth?: YtdMonthPurchases[];
  /** When set, only these platforms contribute to conversions (spend still uses all rows). */
  conversionsPlatformSlugs?: string[];
};

function mergePurchasesIntoYtdRows(
  rows: YtdMonthTableRow[],
  purchasesByMonth?: YtdMonthPurchases[],
): YtdMonthTableRow[] {
  if (!purchasesByMonth) return rows;
  return rows.map((row, i) => {
    const p = purchasesByMonth[i] ?? { purchases: 0, purchaseValue: 0 };
    const spend = row.spend;
    return {
      ...row,
      purchases: p.purchases,
      purchaseValue: p.purchaseValue,
      roas: spend > 0 && p.purchaseValue > 0 ? p.purchaseValue / spend : 0,
    };
  });
}

/**
 * Aggregate `daily_performance` rows into January–December totals for `calendarYear`.
 * `asOfIsoDate` (YYYY-MM-DD, UTC) defaults to today; months strictly after that month show as future (UI dashes).
 */
export function buildYtdMonthlyTableRows(
  rows: DailyPerfRow[],
  calendarYear: number,
  options?: BuildYtdMonthlyTableRowsOptions,
): YtdMonthTableRow[] {
  const asOf = (options?.asOfIsoDate ?? new Date().toISOString().slice(0, 10)).slice(0, 10);
  const refYear = parseInt(asOf.slice(0, 4), 10);
  const refMonth0 = parseInt(asOf.slice(5, 7), 10) - 1;

  const buckets = Array.from({ length: 12 }, () => ({
    impressions: 0,
    clicks: 0,
    spendCents: 0,
    conversions: 0,
  }));
  const yearPrefix = `${calendarYear}-`;
  const convSlugs = options?.conversionsPlatformSlugs;
  for (const r of rows) {
    const rd = r.report_date ?? "";
    if (!rd.startsWith(yearPrefix)) continue;
    const monthIdx = parseInt(rd.slice(5, 7), 10) - 1;
    if (monthIdx < 0 || monthIdx > 11 || Number.isNaN(monthIdx)) continue;
    const b = buckets[monthIdx];
    b.impressions += Number(r.impressions ?? 0);
    b.clicks += Number(r.clicks ?? 0);
    b.spendCents += Number(r.spend_cents ?? 0);
    if (!convSlugs?.length) {
      b.conversions += Number(r.conversions ?? 0);
    } else {
      const slug = canonicalReportPlatformSlug(r.platform);
      if (slug && convSlugs.includes(slug)) {
        b.conversions += Number(r.conversions ?? 0);
      }
    }
  }
  const built = buckets.map((b, i) => {
    const spend = b.spendCents / 100;
    const conv = b.conversions;
    const isFutureMonth =
      calendarYear > refYear || (calendarYear === refYear && i > refMonth0);
    return {
      monthLabel: CALENDAR_MONTH_NAMES[i],
      impressions: b.impressions,
      clicks: b.clicks,
      spend,
      conversions: conv,
      costPerConversion: conv > 0 ? spend / conv : 0,
      avgCpc: b.clicks > 0 ? spend / b.clicks : 0,
      isFutureMonth,
    };
  });
  return mergePurchasesIntoYtdRows(built, options?.purchasesByMonth);
}

const META_PURCHASE_EVENT = "purchase";

/** Meta ecommerce purchase event names (`client_conversions` + canonical `purchase` from sync). */
export async function resolveMetaPurchaseEventNames(
  supabase: SB,
  clientId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("client_conversions")
    .select("raw_name, platform, conversion_type, is_active")
    .eq("client_id", clientId)
    .eq("is_active", true);
  if (error) throw error;

  const names = new Set<string>([META_PURCHASE_EVENT]);
  for (const row of data ?? []) {
    if (!platformSlugMatchesRow(row.platform ?? "", "meta")) continue;
    const type = (row.conversion_type ?? "").trim().toLowerCase();
    const raw = (row.raw_name ?? "").trim();
    if (type === "purchase" && raw) names.add(raw);
  }
  return Array.from(names);
}

/** Google ecommerce purchase event names from active `client_conversions` (`conversion_type = purchase`). */
export async function resolveGooglePurchaseEventNames(
  supabase: SB,
  clientId: string,
): Promise<string[]> {
  const stJamesEvents = stJamesCombinedGooglePurchaseEventNames(clientId);
  const { data, error } = await supabase
    .from("client_conversions")
    .select("raw_name, platform, conversion_type, is_active")
    .eq("client_id", clientId)
    .eq("is_active", true);
  if (error) throw error;

  const names = new Set<string>(stJamesEvents);
  for (const row of data ?? []) {
    if (!platformSlugMatchesRow(row.platform ?? "", "google")) continue;
    const type = (row.conversion_type ?? "").trim().toLowerCase();
    const raw = (row.raw_name ?? "").trim();
    if (type === "purchase" && raw) names.add(raw);
  }
  return Array.from(names);
}

function emptyMonthlyPurchases(): YtdMonthPurchases[] {
  return Array.from({ length: 12 }, () => ({
    purchases: 0,
    purchaseValue: 0,
  }));
}

type CampaignConversionDailySumRow = {
  report_date: string;
  conversions: number | null;
  conversion_value: number | null;
};

/**
 * All matching `campaign_conversion_daily` rows for a client/platform/date range.
 * Paginates past the PostgREST row cap and does not join or filter through `campaigns`.
 */
async function fetchAllCampaignConversionDailyForClient(
  supabase: SB,
  clientId: string,
  platform: string,
  eventNames: string[],
  start: string,
  end: string,
): Promise<CampaignConversionDailySumRow[]> {
  if (!eventNames.length) return [];

  const pageSize = 1000;
  let offset = 0;
  const all: CampaignConversionDailySumRow[] = [];

  for (;;) {
    const { data, error } = await supabase
      .from("campaign_conversion_daily")
      .select("report_date, conversions, conversion_value")
      .eq("client_id", clientId)
      .eq("platform", platform)
      .in("event_name", eventNames)
      .gte("report_date", start)
      .lte("report_date", end)
      .order("report_date", { ascending: true })
      .order("campaign_id", { ascending: true })
      .order("event_name", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;

    const batch = data ?? [];
    all.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return all;
}

function aggregateCampaignConversionDailyByMonth(
  rows: CampaignConversionDailySumRow[],
  calendarYear: number,
): YtdMonthPurchases[] {
  const purchaseByMonth = emptyMonthlyPurchases();
  const yearPrefix = `${calendarYear}-`;
  for (const r of rows) {
    const rd = r.report_date ?? "";
    if (!rd.startsWith(yearPrefix)) continue;
    const monthIdx = parseInt(rd.slice(5, 7), 10) - 1;
    if (monthIdx < 0 || monthIdx > 11 || Number.isNaN(monthIdx)) continue;
    purchaseByMonth[monthIdx].purchases += Number(r.conversions ?? 0);
    purchaseByMonth[monthIdx].purchaseValue += Number(r.conversion_value ?? 0);
  }
  return purchaseByMonth;
}

function aggregateMonthlyPurchasesFromEvents(
  events: {
    occurred_on: string;
    event_count: number | null;
    event_name: string;
    platform: string;
  }[],
  calendarYear: number,
  purchaseEventNames: Set<string>,
): YtdMonthPurchases[] {
  const purchaseByMonth = emptyMonthlyPurchases();
  const yearPrefix = `${calendarYear}-`;
  for (const ev of events) {
    if (!platformSlugMatchesRow(ev.platform ?? "", "meta")) continue;
    const eventName = (ev.event_name ?? "").trim();
    if (!purchaseEventNames.has(eventName)) continue;
    const rd = ev.occurred_on ?? "";
    if (!rd.startsWith(yearPrefix)) continue;
    const monthIdx = parseInt(rd.slice(5, 7), 10) - 1;
    if (monthIdx < 0 || monthIdx > 11 || Number.isNaN(monthIdx)) continue;
    purchaseByMonth[monthIdx].purchases += Number(ev.event_count ?? 0);
  }
  return purchaseByMonth;
}

async function mergeMonthlyPurchaseValueFromCampaignConversionDaily(
  supabase: SB,
  clientId: string,
  calendarYear: number,
  purchaseEventNames: string[],
  purchaseByMonth: YtdMonthPurchases[],
): Promise<void> {
  const yearStart = `${calendarYear}-01-01`;
  const yearEnd = `${calendarYear}-12-31`;

  const { data: convDaily, error } = await supabase
    .from("campaign_conversion_daily")
    .select("report_date, conversion_value, event_name")
    .eq("client_id", clientId)
    .eq("platform", "meta")
    .in("event_name", purchaseEventNames)
    .gte("report_date", yearStart)
    .lte("report_date", yearEnd);
  if (error) {
    console.warn("[report] mergeMonthlyPurchaseValueFromCampaignConversionDaily:", error.message);
    return;
  }

  const yearPrefix = `${calendarYear}-`;
  for (const r of convDaily ?? []) {
    const rd = r.report_date ?? "";
    if (!rd.startsWith(yearPrefix)) continue;
    const monthIdx = parseInt(rd.slice(5, 7), 10) - 1;
    if (monthIdx < 0 || monthIdx > 11 || Number.isNaN(monthIdx)) continue;
    purchaseByMonth[monthIdx].purchaseValue += Number(r.conversion_value ?? 0);
  }
}

/**
 * Monthly Meta purchase counts (account-level `conversion_events`) and revenue when available
 * (`campaign_conversion_daily` per-campaign values summed by month).
 */
export async function fetchMetaEcommercePurchasesByMonth(
  supabase: SB,
  clientId: string,
  calendarYear: number,
): Promise<YtdMonthPurchases[]> {
  const yearStart = `${calendarYear}-01-01`;
  const yearEnd = `${calendarYear}-12-31`;
  const purchaseEventNames = await resolveMetaPurchaseEventNames(supabase, clientId);
  const purchaseEventNameSet = new Set(purchaseEventNames);

  const { data: events, error } = await supabase
    .from("conversion_events")
    .select("occurred_on, event_count, event_name, platform")
    .eq("client_id", clientId)
    .in("event_name", purchaseEventNames)
    .gte("occurred_on", yearStart)
    .lte("occurred_on", yearEnd);
  if (error) {
    console.warn("[report] fetchMetaEcommercePurchasesByMonth:", error.message);
    return emptyMonthlyPurchases();
  }

  const purchaseByMonth = aggregateMonthlyPurchasesFromEvents(
    events ?? [],
    calendarYear,
    purchaseEventNameSet,
  );
  await mergeMonthlyPurchaseValueFromCampaignConversionDaily(
    supabase,
    clientId,
    calendarYear,
    purchaseEventNames,
    purchaseByMonth,
  );
  return purchaseByMonth;
}

/**
 * Monthly Google ecommerce purchases from `campaign_conversion_daily`
 * (active Google `client_conversions` with `conversion_type = purchase`).
 * Sums all rows by month — no join to `campaigns`.
 */
export async function fetchGoogleEcommercePurchasesByMonth(
  supabase: SB,
  clientId: string,
  calendarYear: number,
): Promise<YtdMonthPurchases[]> {
  const yearStart = `${calendarYear}-01-01`;
  const yearEnd = `${calendarYear}-12-31`;
  const purchaseEventNames = await resolveGooglePurchaseEventNames(supabase, clientId);
  if (purchaseEventNames.length === 0) return emptyMonthlyPurchases();

  try {
    const rows = await fetchAllCampaignConversionDailyForClient(
      supabase,
      clientId,
      "google",
      purchaseEventNames,
      yearStart,
      yearEnd,
    );
    return aggregateCampaignConversionDailyByMonth(rows, calendarYear);
  } catch (error) {
    console.warn("[report] fetchGoogleEcommercePurchasesByMonth:", error);
    return emptyMonthlyPurchases();
  }
}

/** Sum Google purchase rows for a date range (no `campaigns` join). */
export async function fetchGooglePurchaseConversionDailyRows(
  supabase: SB,
  clientId: string,
  start: string,
  end: string,
): Promise<CampaignConversionDailySumRow[]> {
  const purchaseEventNames = await resolveGooglePurchaseEventNames(supabase, clientId);
  if (purchaseEventNames.length === 0) return [];
  return fetchAllCampaignConversionDailyForClient(
    supabase,
    clientId,
    "google",
    purchaseEventNames,
    start,
    end,
  );
}

function aggregateHudsonOverviewPurchasesFromEvents(
  events: {
    occurred_on: string;
    event_count: number | null;
    event_name: string;
    platform: string;
  }[],
  calendarYear: number,
): YtdMonthPurchases[] {
  const purchaseByMonth = emptyMonthlyPurchases();
  const yearPrefix = `${calendarYear}-`;
  for (const ev of events) {
    if ((ev.event_name ?? "").trim().toLowerCase() !== META_PURCHASE_EVENT) continue;
    const plat = canonicalReportPlatformSlug(ev.platform);
    if (plat !== "meta" && plat !== "tiktok") continue;
    const rd = ev.occurred_on ?? "";
    if (!rd.startsWith(yearPrefix)) continue;
    const monthIdx = parseInt(rd.slice(5, 7), 10) - 1;
    if (monthIdx < 0 || monthIdx > 11 || Number.isNaN(monthIdx)) continue;
    purchaseByMonth[monthIdx].purchases += Number(ev.event_count ?? 0);
  }
  return purchaseByMonth;
}

/**
 * Hudson Table overview YTD: purchase counts from Meta + TikTok `conversion_events`
 * (`event_name = purchase`); purchase value from Meta `campaign_conversion_daily`.
 */
export async function fetchHudsonOverviewPurchasesByMonth(
  supabase: SB,
  clientId: string,
  calendarYear: number,
): Promise<YtdMonthPurchases[]> {
  const yearStart = `${calendarYear}-01-01`;
  const yearEnd = `${calendarYear}-12-31`;

  const { data: events, error } = await supabase
    .from("conversion_events")
    .select("occurred_on, event_count, event_name, platform")
    .eq("client_id", clientId)
    .eq("event_name", META_PURCHASE_EVENT)
    .gte("occurred_on", yearStart)
    .lte("occurred_on", yearEnd);
  if (error) {
    console.warn("[report] fetchHudsonOverviewPurchasesByMonth:", error.message);
    return emptyMonthlyPurchases();
  }

  const purchaseByMonth = aggregateHudsonOverviewPurchasesFromEvents(
    events ?? [],
    calendarYear,
  );
  const purchaseEventNames = await resolveMetaPurchaseEventNames(supabase, clientId);
  await mergeMonthlyPurchaseValueFromCampaignConversionDaily(
    supabase,
    clientId,
    calendarYear,
    purchaseEventNames,
    purchaseByMonth,
  );
  return purchaseByMonth;
}

/**
 * Adds monthly purchase / value / ROAS to YTD rows for Meta ecommerce clients.
 * Purchase counts come from account-level `conversion_events`; value from `campaign_conversion_daily` when present.
 */
export async function enrichYtdRowsWithMetaEcommercePurchases(
  supabase: SB,
  clientId: string,
  calendarYear: number,
  rows: YtdMonthTableRow[],
): Promise<YtdMonthTableRow[]> {
  const purchasesByMonth = await fetchMetaEcommercePurchasesByMonth(
    supabase,
    clientId,
    calendarYear,
  );
  return mergePurchasesIntoYtdRows(rows, purchasesByMonth);
}

export type DateWindow = {
  currentStart: string;
  currentEnd: string;
  priorStart: string;
  priorEnd: string;
};

export type ActiveConversionPairIndex = {
  pairSet: Set<string>;
  rawNames: string[];
};

export function activeConversionPairKey(platform: string, eventOrRawName: string): string {
  const canon = canonicalReportPlatformSlug(platform);
  const plat = canon ?? (platform ?? "").trim().toLowerCase();
  return `${plat}::${eventOrRawName}`;
}

export async function sumActiveConversionsForPlatform(
  supabase: SB,
  clientId: string,
  windows: DateWindow,
  pairs: ActiveConversionPairIndex,
  platformSlug: string,
): Promise<{ current: number; prior: number }> {
  if (pairs.rawNames.length === 0) return { current: 0, prior: 0 };

  const { data: events, error } = await supabase
    .from("conversion_events")
    .select("occurred_on, event_count, event_name, platform")
    .eq("client_id", clientId)
    .in("event_name", pairs.rawNames)
    .gte("occurred_on", windows.priorStart)
    .lte("occurred_on", windows.currentEnd);
  if (error) throw error;

  let current = 0;
  let prior = 0;
  for (const ev of events ?? []) {
    if (!platformSlugMatchesRow(ev.platform ?? "", platformSlug)) continue;
    const key = activeConversionPairKey(ev.platform ?? "", ev.event_name ?? "");
    if (!pairs.pairSet.has(key)) continue;
    const n = Number(ev.event_count ?? 0);
    if (ev.occurred_on >= windows.currentStart) current += n;
    else if (ev.occurred_on >= windows.priorStart && ev.occurred_on <= windows.priorEnd) prior += n;
  }
  return { current, prior };
}

export function buildChartDataForRows(
  rows: DailyPerfRow[],
  start: string,
  end: string,
): ReportSeriesPoint[] {
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
    const iso = d.toISOString().slice(0, 10);
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type CampaignTableRow = {
  id: string;
  name: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  /** Meta / Google ecommerce — summed from `campaign_daily_performance.reach`. */
  reach?: number;
  /** Meta tab only — summed from `campaign_daily_performance.landing_page_views`. */
  landingPageViews?: number;
  /** Meta tab — `client_conversions.display_name = 'Contact Forms'`. */
  contactForms?: number;
  /** Ecommerce — purchase count from `campaign_conversion_daily`. */
  purchases?: number;
  /** Ecommerce — purchase conversion value from `campaign_conversion_daily`. */
  purchaseValue?: number;
  /** Ecommerce — purchase value / spend. */
  roas?: number;
};

export type FetchCampaignPerformanceOptions = {
  /** When true with Meta or Google platform, attach purchase / purchase value / ROAS per campaign. */
  isEcommerceClient?: boolean;
};

/**
 * Per-campaign purchase metrics for Meta ecommerce (`campaign_conversion_daily`).
 * Falls back to spend-proportional allocation from account-level `conversion_events` when per-campaign rows are empty.
 */
async function fetchMetaEcommercePurchaseByCampaign(
  supabase: SB,
  clientId: string,
  campaignIds: string[],
  start: string,
  end: string,
): Promise<Map<string, { purchases: number; purchaseValue: number }>> {
  const out = new Map<string, { purchases: number; purchaseValue: number }>();
  if (!campaignIds.length) return out;

  const purchaseEventNames = await resolveMetaPurchaseEventNames(supabase, clientId);

  const { data, error } = await supabase
    .from("campaign_conversion_daily")
    .select("campaign_id, conversions, conversion_value, event_name")
    .eq("client_id", clientId)
    .eq("platform", "meta")
    .in("campaign_id", campaignIds)
    .in("event_name", purchaseEventNames)
    .gte("report_date", start)
    .lte("report_date", end);
  if (error) {
    console.warn("[report] fetchMetaEcommercePurchaseByCampaign:", error.message);
    return out;
  }

  for (const r of data ?? []) {
    const cid = r.campaign_id;
    const cur = out.get(cid) ?? { purchases: 0, purchaseValue: 0 };
    cur.purchases += Number(r.conversions ?? 0);
    cur.purchaseValue += Number(r.conversion_value ?? 0);
    out.set(cid, cur);
  }
  return out;
}

/** Per-campaign Google ecommerce purchases from `campaign_conversion_daily`. */
async function fetchGoogleEcommercePurchaseByCampaign(
  supabase: SB,
  clientId: string,
  campaignIds: string[],
  start: string,
  end: string,
): Promise<Map<string, { purchases: number; purchaseValue: number }>> {
  const out = new Map<string, { purchases: number; purchaseValue: number }>();
  if (!campaignIds.length) return out;

  const purchaseEventNames = await resolveGooglePurchaseEventNames(supabase, clientId);
  if (purchaseEventNames.length === 0) return out;

  const { data, error } = await supabase
    .from("campaign_conversion_daily")
    .select("campaign_id, conversions, conversion_value, event_name")
    .eq("client_id", clientId)
    .eq("platform", "google")
    .in("event_name", purchaseEventNames)
    .in("campaign_id", campaignIds)
    .gte("report_date", start)
    .lte("report_date", end);
  if (error) {
    console.warn("[report] fetchGoogleEcommercePurchaseByCampaign:", error.message);
    return out;
  }

  for (const r of data ?? []) {
    const cid = r.campaign_id;
    const cur = out.get(cid) ?? { purchases: 0, purchaseValue: 0 };
    cur.purchases += Number(r.conversions ?? 0);
    cur.purchaseValue += Number(r.conversion_value ?? 0);
    out.set(cid, cur);
  }
  return out;
}

async function fetchMetaEcommerceAccountPurchaseTotals(
  supabase: SB,
  clientId: string,
  start: string,
  end: string,
): Promise<{ purchases: number; purchaseValue: number }> {
  const purchaseEventNames = await resolveMetaPurchaseEventNames(supabase, clientId);
  const purchaseEventNameSet = new Set(purchaseEventNames);

  const [{ data: events, error: eErr }, { data: convDaily, error: cErr }] = await Promise.all([
    supabase
      .from("conversion_events")
      .select("occurred_on, event_count, event_name, platform")
      .eq("client_id", clientId)
      .in("event_name", purchaseEventNames)
      .gte("occurred_on", start)
      .lte("occurred_on", end),
    supabase
      .from("campaign_conversion_daily")
      .select("conversion_value, event_name, platform")
      .eq("client_id", clientId)
      .eq("platform", "meta")
      .in("event_name", purchaseEventNames)
      .gte("report_date", start)
      .lte("report_date", end),
  ]);
  if (eErr) {
    console.warn("[report] fetchMetaEcommerceAccountPurchaseTotals events:", eErr.message);
  }
  if (cErr) {
    console.warn("[report] fetchMetaEcommerceAccountPurchaseTotals convDaily:", cErr.message);
  }

  let purchases = 0;
  for (const ev of events ?? []) {
    if (!platformSlugMatchesRow(ev.platform ?? "", "meta")) continue;
    if (!purchaseEventNameSet.has((ev.event_name ?? "").trim())) continue;
    purchases += Number(ev.event_count ?? 0);
  }

  let purchaseValue = 0;
  for (const row of convDaily ?? []) {
    purchaseValue += Number(row.conversion_value ?? 0);
  }

  return { purchases, purchaseValue };
}

function applySpendProportionalPurchaseFallback(
  rows: CampaignTableRow[],
  accountTotals: { purchases: number; purchaseValue: number },
): void {
  const totalSpend = rows.reduce((sum, r) => sum + r.cost, 0);
  if (totalSpend <= 0 || accountTotals.purchases <= 0) return;

  for (const row of rows) {
    if (row.cost <= 0) {
      row.purchases = 0;
      row.purchaseValue = 0;
      row.roas = 0;
      continue;
    }
    const share = row.cost / totalSpend;
    row.purchases = Math.round(accountTotals.purchases * share);
    row.purchaseValue = round2(accountTotals.purchaseValue * share);
    row.roas =
      row.cost > 0 && row.purchaseValue > 0 ? row.purchaseValue / row.cost : 0;
  }
}

export async function fetchCampaignPerformanceRows(
  supabase: SB,
  clientId: string,
  platformSlug: string,
  start: string,
  end: string,
  options?: FetchCampaignPerformanceOptions,
): Promise<CampaignTableRow[]> {
  const want =
    canonicalReportPlatformSlug(platformSlug) ?? platformSlug.trim().toLowerCase();

  const { data: campaignsRaw, error: cErr } = await supabase
    .from("campaigns")
    .select("id, campaign_name, platform")
    .eq("client_id", clientId);
  if (cErr) return [];
  const campaigns = (campaignsRaw ?? []).filter((c) =>
    platformSlugMatchesRow(c.platform ?? "", want),
  );
  if (!campaigns.length) return [];

  const ids = campaigns.map((c) => c.id);
  const { data: daily, error: dErr } = await supabase
    .from("campaign_daily_performance")
    .select(
      "campaign_id, impressions, clicks, spend_cents, conversions, reach, landing_page_views",
    )
    .eq("client_id", clientId)
    .in("campaign_id", ids)
    .gte("report_date", start)
    .lte("report_date", end);
  if (dErr) return [];

  const nameById = new Map(campaigns.map((c) => [c.id, c.campaign_name ?? "Campaign"]));
  const agg = new Map<
    string,
    {
      impressions: number;
      clicks: number;
      spendCents: number;
      conversions: number;
      reach: number;
      landingPageViews: number;
    }
  >();
  for (const r of daily ?? []) {
    const cid = r.campaign_id;
    const cur = agg.get(cid) ?? {
      impressions: 0,
      clicks: 0,
      spendCents: 0,
      conversions: 0,
      reach: 0,
      landingPageViews: 0,
    };
    cur.impressions += Number(r.impressions ?? 0);
    cur.clicks += Number(r.clicks ?? 0);
    cur.spendCents += Number(r.spend_cents ?? 0);
    cur.conversions += Number(r.conversions ?? 0);
    cur.reach += Number(r.reach ?? 0);
    cur.landingPageViews += Number(r.landing_page_views ?? 0);
    agg.set(cid, cur);
  }

  const isMetaEcommerce = want === "meta" && options?.isEcommerceClient === true;
  const isGoogleEcommerce = want === "google" && options?.isEcommerceClient === true;
  const purchaseByCampaign = isMetaEcommerce
    ? await fetchMetaEcommercePurchaseByCampaign(supabase, clientId, ids, start, end)
    : isGoogleEcommerce
      ? await fetchGoogleEcommercePurchaseByCampaign(supabase, clientId, ids, start, end)
      : null;

  const rows: CampaignTableRow[] = [];
  agg.forEach((v, campaignId) => {
    if (v.impressions < 1) return;
    const cost = v.spendCents / 100;
    const base: CampaignTableRow = {
      id: campaignId,
      name: nameById.get(campaignId) ?? "Campaign",
      impressions: v.impressions,
      clicks: v.clicks,
      cost,
      conversions: v.conversions,
    };
    if (want === "meta") {
      base.reach = v.reach;
      base.landingPageViews = v.landingPageViews;
    }
    if ((isMetaEcommerce || isGoogleEcommerce) && purchaseByCampaign) {
      const p = purchaseByCampaign.get(campaignId);
      base.purchases = p?.purchases ?? 0;
      base.purchaseValue = p?.purchaseValue ?? 0;
      base.roas =
        cost > 0 && (p?.purchaseValue ?? 0) > 0 ? (p?.purchaseValue ?? 0) / cost : 0;
    }
    rows.push(base);
  });

  if (isMetaEcommerce && purchaseByCampaign) {
    const campaignPurchaseTotal = Array.from(purchaseByCampaign.values()).reduce(
      (sum, p) => sum + p.purchases,
      0,
    );
    if (campaignPurchaseTotal <= 0) {
      const accountTotals = await fetchMetaEcommerceAccountPurchaseTotals(
        supabase,
        clientId,
        start,
        end,
      );
      if (accountTotals.purchases > 0) {
        applySpendProportionalPurchaseFallback(rows, accountTotals);
      }
    }
  }

  rows.sort((a, b) => b.cost - a.cost);
  return rows;
}
