import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

import { conversionRawNameList } from "./meta-campaign-conversions";
import { platformSlugMatchesRow } from "./report-tab-platform";

type SB = SupabaseClient<Database>;

export const HUDSON_LOCATIONS = [
  "Brooklyn",
  "Hoboken",
  "Philadelphia",
  "Stamford",
  "Princeton",
  "Roof Top",
] as const;

const MONTH_NAMES = [
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

const YEAR_2025 = 2025;
const YEAR_2026 = 2026;

export type LocationMonthRow = {
  monthLabel: string;
  monthKey: string;
  contactForms: number;
  purchases: number;
  spend: number;
  sales: number;
  roas: number;
  /** True when this calendar month is still in the future (UI dashes). */
  isFutureMonth?: boolean;
  isGrandTotal?: boolean;
};

export type LocationBreakdownTable = {
  locationName: string;
  yearLabel: string;
  campaignId?: string;
  rows: LocationMonthRow[];
};

export type LocationComparePair = {
  locationName: string;
  table2026: LocationBreakdownTable;
  table2025: LocationBreakdownTable;
};

export type LocationBreakdownState = {
  aggregate: LocationComparePair | null;
  locations: LocationComparePair[];
};

type MonthBucket = {
  contactForms: number;
  purchases: number;
  spendCents: number;
  sales: number;
};

type CampaignRow = {
  id: string;
  campaign_name: string;
};

type MonthDef = { key: string; label: string };

type DailySpendRow = {
  campaign_id: string;
  report_date: string;
  spend_cents: number | null;
};

type ConvDailyRow = {
  campaign_id: string;
  report_date: string;
  event_name: string | null;
  conversions: number | null;
  conversion_value: number | null;
};

export type HudsonLocationPlatform = "meta" | "google";

export type FetchHudsonLocationBreakdownOptions = {
  platformSlug: HudsonLocationPlatform;
  aggregateName: string;
  logPrefix: string;
  debugEnvVar: string;
  contactFormRawNames: Set<string>;
  purchaseRawNames: Set<string>;
  filterDailyByPlatform?: boolean;
};

function normalizeCampaignName(name: string): string {
  return name.trim().toLowerCase();
}

function isRooftopCampaign(campaignName: string): boolean {
  return normalizeCampaignName(campaignName).includes("rooftop");
}

/** True when `campaignName` belongs to `location` (case-insensitive substring rules). */
export function campaignMatchesLocation(campaignName: string, location: string): boolean {
  const name = normalizeCampaignName(campaignName);
  const loc = location.trim().toLowerCase();

  if (loc === "roof top") {
    return isRooftopCampaign(campaignName);
  }

  return name.includes(loc);
}

function findCampaignsForLocation(location: string, campaigns: CampaignRow[]): CampaignRow[] {
  return campaigns.filter((c) => campaignMatchesLocation(c.campaign_name, location));
}

function emptyBucket(): MonthBucket {
  return { contactForms: 0, purchases: 0, spendCents: 0, sales: 0 };
}

function monthDefsForYear(year: number): MonthDef[] {
  if (year !== YEAR_2025 && year !== YEAR_2026) return [];
  return MONTH_NAMES.map((label, i) => ({
    key: `${year}-${String(i + 1).padStart(2, "0")}`,
    label,
  }));
}

/** Same future-month rule as YTD monthly table (`buildYtdMonthlyTableRows`). */
function isLocationFutureMonth(monthKey: string, year: number, asOf: Date): boolean {
  if (year !== YEAR_2026) return false;
  const monthIdx = parseInt(monthKey.slice(5, 7), 10) - 1;
  if (monthIdx < 0 || monthIdx > 11 || Number.isNaN(monthIdx)) return false;

  const asOfYear = asOf.getFullYear();
  const asOfMonthIdx = asOf.getMonth();
  return year > asOfYear || (year === asOfYear && monthIdx > asOfMonthIdx);
}

function breakdownQueryRange(asOf: Date): { start: string; end: string } {
  const year = asOf.getFullYear();
  const month = asOf.getMonth();
  const queryEndYear = year >= YEAR_2026 ? year : YEAR_2026;
  const queryEndMonth = year >= YEAR_2026 ? month : asOf.getMonth();
  const lastDay = new Date(queryEndYear, queryEndMonth + 1, 0).getDate();
  const end = `${queryEndYear}-${String(queryEndMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start: `${YEAR_2025}-01-01`, end };
}

function isTrackedMonthKey(monthKey: string, asOf: Date): boolean {
  const year = parseInt(monthKey.slice(0, 4), 10);
  const month = parseInt(monthKey.slice(5, 7), 10);
  if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) return false;
  if (year === YEAR_2025) return true;
  if (year === YEAR_2026) {
    const asOfYear = asOf.getFullYear();
    if (asOfYear < YEAR_2026) return false;
    if (asOfYear > YEAR_2026) return true;
    return month <= asOf.getMonth() + 1;
  }
  return false;
}

function totalSpendCentsForCampaigns(
  byCampaign: Map<string, Map<string, MonthBucket>>,
  campaignIds: string[],
): number {
  let total = 0;
  for (const cid of campaignIds) {
    const inner = byCampaign.get(cid);
    if (!inner) continue;
    for (const b of Array.from(inner.values())) total += b.spendCents;
  }
  return total;
}

async function fetchCampaignDailySpendPaginated(
  supabase: SB,
  clientId: string,
  campaignIdSet: Set<string>,
  start: string,
  end: string,
): Promise<DailySpendRow[]> {
  if (!campaignIdSet.size) return [];

  const pageSize = 1000;
  let offset = 0;
  const all: DailySpendRow[] = [];

  for (;;) {
    const { data, error } = await supabase
      .from("campaign_daily_performance")
      .select("campaign_id, report_date, spend_cents")
      .eq("client_id", clientId)
      .gte("report_date", start)
      .lte("report_date", end)
      .order("report_date", { ascending: true })
      .order("campaign_id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;

    const batch = ((data ?? []) as DailySpendRow[]).filter((r) =>
      campaignIdSet.has(r.campaign_id),
    );
    all.push(...batch);
    if ((data ?? []).length < pageSize) break;
    offset += pageSize;
  }

  return all;
}

async function fetchCampaignConversionDailyPaginated(
  supabase: SB,
  clientId: string,
  campaignIdSet: Set<string>,
  eventNames: string[],
  start: string,
  end: string,
  platformSlug?: HudsonLocationPlatform,
): Promise<ConvDailyRow[]> {
  if (!campaignIdSet.size || !eventNames.length) return [];

  const pageSize = 1000;
  let offset = 0;
  const all: ConvDailyRow[] = [];

  for (;;) {
    let query = supabase
      .from("campaign_conversion_daily")
      .select("campaign_id, report_date, event_name, conversions, conversion_value")
      .eq("client_id", clientId)
      .in("event_name", eventNames)
      .gte("report_date", start)
      .lte("report_date", end);
    if (platformSlug) {
      query = query.eq("platform", platformSlug);
    }

    const { data, error } = await query
      .order("report_date", { ascending: true })
      .order("campaign_id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;

    const batch = ((data ?? []) as ConvDailyRow[]).filter((r) =>
      campaignIdSet.has(r.campaign_id),
    );
    all.push(...batch);
    if ((data ?? []).length < pageSize) break;
    offset += pageSize;
  }

  return all;
}

function buildYearRows(
  buckets: Map<string, MonthBucket>,
  months: MonthDef[],
  year: number,
  asOf: Date,
): LocationMonthRow[] {
  const rows: LocationMonthRow[] = [];
  const totals = emptyBucket();

  for (const month of months) {
    const isFutureMonth = isLocationFutureMonth(month.key, year, asOf);
    const b = buckets.get(month.key) ?? emptyBucket();
    if (!isFutureMonth) {
      totals.contactForms += b.contactForms;
      totals.purchases += b.purchases;
      totals.spendCents += b.spendCents;
      totals.sales += b.sales;
    }

    const spend = b.spendCents / 100;
    rows.push({
      monthLabel: month.label,
      monthKey: month.key,
      contactForms: b.contactForms,
      purchases: b.purchases,
      spend,
      sales: b.sales,
      roas: spend > 0 ? b.sales / spend : 0,
      isFutureMonth,
    });
  }

  const totalSpend = totals.spendCents / 100;
  rows.push({
    monthLabel: "Grand Total",
    monthKey: "grand-total",
    contactForms: totals.contactForms,
    purchases: totals.purchases,
    spend: totalSpend,
    sales: totals.sales,
    roas: totalSpend > 0 ? totals.sales / totalSpend : 0,
    isGrandTotal: true,
  });

  return rows;
}

function buildYearTable(
  locationName: string,
  yearLabel: string,
  buckets: Map<string, MonthBucket>,
  months: MonthDef[],
  year: number,
  asOf: Date,
  campaignId?: string,
): LocationBreakdownTable {
  return {
    locationName,
    yearLabel,
    campaignId,
    rows: buildYearRows(buckets, months, year, asOf),
  };
}

function aggregateBuckets(
  byCampaign: Map<string, Map<string, MonthBucket>>,
  campaignIds: string[],
): Map<string, MonthBucket> {
  const agg = new Map<string, MonthBucket>();
  for (const cid of campaignIds) {
    const inner = byCampaign.get(cid);
    if (!inner) continue;
    for (const [monthKey, b] of Array.from(inner.entries())) {
      const cur = agg.get(monthKey) ?? emptyBucket();
      cur.contactForms += b.contactForms;
      cur.purchases += b.purchases;
      cur.spendCents += b.spendCents;
      cur.sales += b.sales;
      agg.set(monthKey, cur);
    }
  }
  return agg;
}

function buildComparePair(
  locationName: string,
  buckets: Map<string, MonthBucket>,
  months2026: MonthDef[],
  months2025: MonthDef[],
  asOf: Date,
  campaignId?: string,
): LocationComparePair {
  return {
    locationName,
    table2026: buildYearTable(
      locationName,
      "2026",
      buckets,
      months2026,
      YEAR_2026,
      asOf,
      campaignId,
    ),
    table2025: buildYearTable(
      locationName,
      "2025",
      buckets,
      months2025,
      YEAR_2025,
      asOf,
      campaignId,
    ),
  };
}

/**
 * Hudson Table: campaign performance by restaurant location with YoY comparison.
 * 2026 and 2025 each show Jan–Dec; future 2026 months render as dashes in the UI.
 */
export async function fetchHudsonLocationBreakdown(
  supabase: SB,
  clientId: string,
  opts: FetchHudsonLocationBreakdownOptions,
  asOf: Date = new Date(),
): Promise<LocationBreakdownState> {
  const empty: LocationBreakdownState = { aggregate: null, locations: [] };
  const months2026 = monthDefsForYear(YEAR_2026);
  const months2025 = monthDefsForYear(YEAR_2025);
  if (!months2026.length || !months2025.length) return empty;

  const debugEnabled = process.env[opts.debugEnvVar] === "1";
  const debugLog = (message: string, payload?: unknown) => {
    if (payload !== undefined) {
      console.log(`${opts.logPrefix} ${message}`, payload);
    } else {
      console.log(`${opts.logPrefix} ${message}`);
    }
  };
  const verboseLog = (message: string, payload?: unknown) => {
    if (!debugEnabled) return;
    debugLog(message, payload);
  };

  const { contactFormRawNames, purchaseRawNames } = opts;
  const allRawNames = conversionRawNameList({ contactFormRawNames, purchaseRawNames });
  const platformFilter = opts.filterDailyByPlatform ? opts.platformSlug : undefined;

  const { data: campaignsRaw, error: cErr } = await supabase
    .from("campaigns")
    .select("id, campaign_name, platform")
    .eq("client_id", clientId);
  if (cErr) {
    console.warn(`${opts.logPrefix} campaigns:`, cErr.message);
    return empty;
  }

  const platformCampaigns: CampaignRow[] = (campaignsRaw ?? [])
    .filter((c) => platformSlugMatchesRow(c.platform ?? "", opts.platformSlug))
    .map((c) => ({ id: c.id, campaign_name: c.campaign_name ?? "Campaign" }));

  verboseLog(
    `loaded ${platformCampaigns.length} ${opts.platformSlug} campaigns (platform-filtered)`,
    platformCampaigns,
  );

  const matched: { locationName: string; campaignIds: string[]; campaigns: CampaignRow[] }[] = [];
  const assignedCampaignIds = new Set<string>();

  for (const locationName of HUDSON_LOCATIONS) {
    const campaigns = findCampaignsForLocation(locationName, platformCampaigns).filter(
      (c) => !assignedCampaignIds.has(c.id),
    );
    if (!campaigns.length) {
      debugLog(`${locationName}: no campaigns matched`);
      continue;
    }
    for (const c of campaigns) assignedCampaignIds.add(c.id);
    matched.push({
      locationName,
      campaignIds: campaigns.map((c) => c.id),
      campaigns,
    });
    debugLog(`${locationName}: matched ${campaigns.length} campaign(s)`, {
      campaigns: campaigns.map((c) => ({ id: c.id, name: c.campaign_name })),
    });

    if (locationName === "Hoboken" && opts.platformSlug === "meta") {
      console.log("[meta-location-breakdown] Hoboken matched campaigns:", campaigns.length);
      console.log(
        "[meta-location-breakdown] Hoboken campaign IDs for spend query:",
        campaigns.map((c) => c.id),
      );
      console.log(
        "[meta-location-breakdown] Hoboken campaign names:",
        campaigns.map((c) => c.campaign_name),
      );
    }
  }

  if (!matched.length) return empty;

  const campaignIdSet = assignedCampaignIds;
  const campaignIds = Array.from(campaignIdSet);
  const { start, end } = breakdownQueryRange(asOf);
  verboseLog(`query range ${start}..${end}`, { campaignCount: campaignIds.length });

  let daily: DailySpendRow[] = [];
  let convDaily: ConvDailyRow[] = [];

  try {
    daily = await fetchCampaignDailySpendPaginated(
      supabase,
      clientId,
      campaignIdSet,
      start,
      end,
    );
  } catch (dErr) {
    console.warn(`${opts.logPrefix} campaign_daily_performance:`, dErr);
  }

  if (opts.platformSlug === "meta") {
    const hobokenMatch = matched.find((m) => m.locationName === "Hoboken");
    if (hobokenMatch) {
      const hobokenIdSet = new Set(hobokenMatch.campaignIds);
      const hobokenDaily = daily.filter((r) => hobokenIdSet.has(r.campaign_id));
      const hobokenSpendCents = hobokenDaily.reduce(
        (sum, r) => sum + Number(r.spend_cents ?? 0),
        0,
      );
      console.log("[meta-location-breakdown] Hoboken spend query returned rows:", hobokenDaily.length);
      console.log(
        "[meta-location-breakdown] Hoboken total spend from query:",
        `$${(hobokenSpendCents / 100).toFixed(2)}`,
        `(${hobokenSpendCents} cents across IDs:`,
        hobokenMatch.campaignIds,
        ")",
      );
    }
  }

  try {
    convDaily = await fetchCampaignConversionDailyPaginated(
      supabase,
      clientId,
      campaignIdSet,
      allRawNames,
      start,
      end,
      platformFilter,
    );
  } catch (cdErr) {
    console.warn(`${opts.logPrefix} campaign_conversion_daily:`, cdErr);
  }

  debugLog(`fetched ${daily.length} campaign_daily_performance rows`, {
    distinctCampaigns: new Set(daily.map((r) => r.campaign_id)).size,
  });

  const byCampaign = new Map<string, Map<string, MonthBucket>>();
  const campBuckets = (campaignId: string) => {
    let inner = byCampaign.get(campaignId);
    if (!inner) {
      inner = new Map<string, MonthBucket>();
      byCampaign.set(campaignId, inner);
    }
    return inner;
  };
  const monthBucket = (campaignId: string, monthKey: string) => {
    const inner = campBuckets(campaignId);
    let b = inner.get(monthKey);
    if (!b) {
      b = emptyBucket();
      inner.set(monthKey, b);
    }
    return b;
  };

  const ingestRow = (campaignId: string, reportDate: string, fn: (b: MonthBucket) => void) => {
    const monthKey = reportDate.slice(0, 7);
    if (!isTrackedMonthKey(monthKey, asOf)) return;
    fn(monthBucket(campaignId, monthKey));
  };

  for (const r of daily) {
    ingestRow(r.campaign_id, r.report_date ?? "", (b) => {
      b.spendCents += Number(r.spend_cents ?? 0);
    });
  }

  for (const r of convDaily) {
    ingestRow(r.campaign_id, r.report_date ?? "", (b) => {
      const name = (r.event_name ?? "").trim();
      const n = Number(r.conversions ?? 0);
      const v = Number(r.conversion_value ?? 0);
      if (contactFormRawNames.has(name)) b.contactForms += n;
      if (purchaseRawNames.has(name)) {
        b.purchases += n;
        b.sales += v;
      }
    });
  }

  const spendByCampaign = new Map<string, number>();
  for (const cid of Array.from(byCampaign.keys())) {
    spendByCampaign.set(cid, totalSpendCentsForCampaigns(byCampaign, [cid]));
  }
  verboseLog("spend cents by campaign_id", Object.fromEntries(spendByCampaign));

  const dailyCampaignIds = new Set(daily.map((r) => r.campaign_id));

  for (const { locationName, campaignIds: locCampaignIds, campaigns } of matched) {
    const spendCents = totalSpendCentsForCampaigns(byCampaign, locCampaignIds);
    debugLog(`${locationName}: summed spend $${(spendCents / 100).toFixed(2)}`, {
      campaignIds: locCampaignIds,
      campaigns: campaigns.map((c) => c.campaign_name),
      missingDailyCampaignIds: locCampaignIds.filter((id) => !dailyCampaignIds.has(id)),
    });
  }

  const aggregateBucketMap = aggregateBuckets(byCampaign, campaignIds);
  const aggregate = buildComparePair(
    opts.aggregateName,
    aggregateBucketMap,
    months2026,
    months2025,
    asOf,
  );

  const locations = matched.map(({ locationName, campaignIds: locCampaignIds }) =>
    buildComparePair(
      locationName,
      aggregateBuckets(byCampaign, locCampaignIds),
      months2026,
      months2025,
      asOf,
    ),
  );

  return { aggregate, locations };
}