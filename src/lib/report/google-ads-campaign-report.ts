import type { SupabaseClient } from "@supabase/supabase-js";

import { isGoogleAdsPlatform, isMicrosoftAdsPlatform } from "@/lib/ad-platforms";
import {
  canonicalMergeLabel,
  conversionMergeBucket,
  rowLabel,
  type BreakdownCfg,
} from "@/lib/report/client-report-metrics";
import type { Database } from "@/lib/types/database";

type SB = SupabaseClient<Database>;

export type ReportCampaignTablePlatform = "google" | "microsoft";

function platformFilterPredicate(platform: ReportCampaignTablePlatform) {
  return (p: string | null | undefined): boolean =>
    platform === "google" ? isGoogleAdsPlatform(p) : isMicrosoftAdsPlatform(p);
}

function dbPlatformEquals(platform: ReportCampaignTablePlatform): string {
  return platform;
}

/** One dynamic Google conversion column (merged by group_name / same rules as breakdown cards). */
export type GoogleCampaignConversionColumn = {
  /** Stable bucket id: `conversionMergeBucket` output or `single:${client_conversion id}` */
  id: string;
  displayLabel: string;
};

export type GoogleCampaignPerfRow = {
  campaignId: string;
  name: string;
  impressions: number;
  clicks: number;
  spend: number;
  /** From `campaign_daily_performance.conversions` (Google “total conversions” for the campaign). */
  totalConversions: number;
  /** Counts keyed like breakdown buckets (`GoogleCampaignConversionColumn.id`). */
  conversionByBucketKey: Record<string, number>;
};

export type GoogleAdsCampaignTableState = {
  /** True if this client has any campaign-level daily rows (sync has populated campaign performance). */
  hasCampaignPerformanceSource: boolean;
  conversionColumns: GoogleCampaignConversionColumn[];
  rows: GoogleCampaignPerfRow[];
  /**
   * True when a query failed (missing tables, RLS, etc.). Same fallback UI as empty data — no server error.
   */
  dataUnavailable?: boolean;
};

const emptyFallback = (): GoogleAdsCampaignTableState => ({
  hasCampaignPerformanceSource: false,
  conversionColumns: [],
  rows: [],
  dataUnavailable: true,
});

type ColBucketAgg = {
  bucketKey: string;
  canonicalLabel: string;
  sortOrderMin: number;
  hasPrimary: boolean;
};

/** Same merge/bucket rules + column order as conversion breakdown cards. */
function prepareGoogleCampaignConversionColumns(convGoogle: BreakdownCfg[]): {
  columns: GoogleCampaignConversionColumn[];
  rawNameToBucketKey: Map<string, string>;
} {
  const sorted = [...convGoogle].sort((a, b) => {
    if (!!b.is_primary !== !!a.is_primary) return a.is_primary ? -1 : 1;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  const bucketMap = new Map<string, ColBucketAgg>();

  for (const c of sorted) {
    const merge = conversionMergeBucket(c);
    const bucketKey = merge ?? `single:${c.id}`;
    const canon = merge ? canonicalMergeLabel(merge, c.group_name?.trim() || rowLabel(c)) : rowLabel(c);
    const so = c.sort_order ?? 999999;
    const prev = bucketMap.get(bucketKey);
    if (!prev) {
      bucketMap.set(bucketKey, {
        bucketKey,
        canonicalLabel: canon,
        sortOrderMin: so,
        hasPrimary: !!c.is_primary,
      });
      continue;
    }
    prev.hasPrimary = prev.hasPrimary || !!c.is_primary;
    prev.sortOrderMin = Math.min(prev.sortOrderMin, so);
    prev.canonicalLabel = merge ? canon : prev.canonicalLabel;
  }

  const columns = Array.from(bucketMap.values())
    .sort((a, b) => {
      if (b.hasPrimary !== a.hasPrimary) return a.hasPrimary ? -1 : 1;
      return a.sortOrderMin - b.sortOrderMin;
    })
    .map((b) => ({ id: b.bucketKey, displayLabel: b.canonicalLabel }));

  const rawNameToBucketKey = new Map<string, string>();
  for (const c of sorted) {
    const merge = conversionMergeBucket(c);
    const bk = merge ?? `single:${c.id}`;
    const rk = (c.raw_name ?? "").trim();
    if (rk) rawNameToBucketKey.set(rk, bk);
  }

  return { columns, rawNameToBucketKey };
}

/**
 * Loads campaign-level rows from `campaigns` / `campaign_daily_performance` for Google or Microsoft.
 * Never throws — returns `dataUnavailable: true` on any read error or empty schema.
 */
export async function fetchAdsCampaignTableState(
  supabase: SB,
  clientId: string,
  start: string,
  end: string,
  platform: ReportCampaignTablePlatform,
): Promise<GoogleAdsCampaignTableState> {
  const matchPlatform = platformFilterPredicate(platform);
  const dbPlatform = dbPlatformEquals(platform);

  try {
    const { count: anyDailyCount, error: cntErr } = await supabase
      .from("campaign_daily_performance")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("platform", dbPlatform);
    if (cntErr) {
      console.warn("[ads-campaign-report] campaign_daily_performance count:", cntErr.message);
      return emptyFallback();
    }
    const hasCampaignPerformanceSource = (anyDailyCount ?? 0) > 0;

    const { data: convRows, error: convErr } = await supabase
      .from("client_conversions")
      .select(
        "id, raw_name, display_name, mapped_name, group_name, conversion_type, sort_order, platform, is_active, status, is_primary",
      )
      .eq("client_id", clientId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (convErr) {
      console.warn("[ads-campaign-report] client_conversions:", convErr.message);
      return emptyFallback();
    }

    let conversionColumns: GoogleCampaignConversionColumn[] = [];
    let rawNameToBucketKey = new Map<string, string>();

    if (platform === "google") {
      const convGoogle: BreakdownCfg[] = (convRows ?? [])
        .filter((r) => isGoogleAdsPlatform(r.platform ?? ""))
        .map((r) => ({
          id: r.id,
          raw_name: r.raw_name ?? "",
          platform: r.platform ?? "",
          display_name: r.display_name,
          mapped_name: r.mapped_name,
          sort_order: r.sort_order,
          is_primary: r.is_primary,
          conversion_type: r.conversion_type ?? "",
          group_name: r.group_name,
        }));
      const prep = prepareGoogleCampaignConversionColumns(convGoogle);
      conversionColumns = prep.columns;
      rawNameToBucketKey = prep.rawNameToBucketKey;
    }

    const { data: campaignsRaw, error: cErr } = await supabase
      .from("campaigns")
      .select("id, campaign_name, platform")
      .eq("client_id", clientId);
    if (cErr) {
      console.warn("[ads-campaign-report] campaigns:", cErr.message);
      return emptyFallback();
    }

    const campaigns = (campaignsRaw ?? []).filter((c) => matchPlatform(c.platform ?? ""));
    if (!campaigns.length) {
      return { hasCampaignPerformanceSource, conversionColumns, rows: [], dataUnavailable: false };
    }

    const ids = campaigns.map((c) => c.id);
    const nameById = new Map(campaigns.map((c) => [c.id, c.campaign_name ?? "Campaign"]));

    const { data: daily, error: dErr } = await supabase
      .from("campaign_daily_performance")
      .select("campaign_id, impressions, clicks, spend_cents, conversions")
      .eq("client_id", clientId)
      .eq("platform", dbPlatform)
      .in("campaign_id", ids)
      .gte("report_date", start)
      .lte("report_date", end);
    if (dErr) {
      console.warn("[ads-campaign-report] campaign_daily_performance:", dErr.message);
      return emptyFallback();
    }

    let convDaily: Array<{
      campaign_id: string;
      event_name: string | null;
      conversions: unknown;
    }> = [];

    if (platform === "google") {
      const { data: convData, error: cdErr } = await supabase
        .from("campaign_conversion_daily")
        .select("campaign_id, event_name, conversions")
        .eq("client_id", clientId)
        .eq("platform", dbPlatform)
        .in("campaign_id", ids)
        .gte("report_date", start)
        .lte("report_date", end);
      if (cdErr) {
        console.warn("[ads-campaign-report] campaign_conversion_daily:", cdErr.message);
        return emptyFallback();
      }
      convDaily = convData ?? [];
    }

    const metrics = new Map<
      string,
      { impressions: number; clicks: number; spendCents: number; conversions: number }
    >();
    for (const r of daily ?? []) {
      const cid = r.campaign_id;
      const cur = metrics.get(cid) ?? { impressions: 0, clicks: 0, spendCents: 0, conversions: 0 };
      cur.impressions += Number(r.impressions ?? 0);
      cur.clicks += Number(r.clicks ?? 0);
      cur.spendCents += Number(r.spend_cents ?? 0);
      cur.conversions += Number(r.conversions ?? 0);
      metrics.set(cid, cur);
    }

    const convByCamp = new Map<string, Map<string, number>>();
    for (const r of convDaily) {
      const cid = r.campaign_id;
      const name = (r.event_name ?? "").trim();
      if (!name) continue;
      const n = Number(r.conversions ?? 0);
      const inner = convByCamp.get(cid) ?? new Map<string, number>();
      inner.set(name, (inner.get(name) ?? 0) + n);
      convByCamp.set(cid, inner);
    }

    const rows: GoogleCampaignPerfRow[] = [];
    for (const [campaignId, m] of Array.from(metrics.entries())) {
      if (m.impressions < 1) continue;
      const inner = convByCamp.get(campaignId);
      const conversionByBucketKey: Record<string, number> = {};
      if (inner && platform === "google") {
        for (const [eventName, v] of Array.from(inner.entries())) {
          const bk = rawNameToBucketKey.get(eventName);
          if (!bk) continue;
          conversionByBucketKey[bk] = (conversionByBucketKey[bk] ?? 0) + v;
        }
      }
      rows.push({
        campaignId,
        name: nameById.get(campaignId) ?? "Campaign",
        impressions: m.impressions,
        clicks: m.clicks,
        spend: m.spendCents / 100,
        totalConversions: m.conversions,
        conversionByBucketKey,
      });
    }

    rows.sort((a, b) => b.spend - a.spend);

    return { hasCampaignPerformanceSource, conversionColumns, rows, dataUnavailable: false };
  } catch (e) {
    console.warn("[ads-campaign-report] unexpected:", e);
    return emptyFallback();
  }
}

/** @deprecated Prefer {@link fetchAdsCampaignTableState} with `platform: "google"`. */
export async function fetchGoogleAdsCampaignTableState(
  supabase: SB,
  clientId: string,
  start: string,
  end: string,
): Promise<GoogleAdsCampaignTableState> {
  return fetchAdsCampaignTableState(supabase, clientId, start, end, "google");
}
