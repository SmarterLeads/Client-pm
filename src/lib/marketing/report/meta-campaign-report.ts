import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

import type { ChannelMetricMap } from "./channel-metric-config";
import { META_CAMPAIGN_OPT_IN_COL_KEYS } from "./channel-metric-config";
import {
  metaConversionRawNameList,
  resolveMetaContactFormAndPurchaseRawNames,
} from "./meta-campaign-conversions";
import {
  fetchCampaignPerformanceRows,
  type CampaignTableRow,
} from "./report-tab-platform";

type SB = SupabaseClient<Database>;

/** True when any client-specific Meta campaign conversion column is enabled. */
export function metaCampaignNeedsCustomConversionMetrics(booleans: ChannelMetricMap): boolean {
  return META_CAMPAIGN_OPT_IN_COL_KEYS.some((k) => booleans[k] === true);
}

/**
 * Loads Meta campaign rows and, when configured, enriches them from
 * `campaign_conversion_daily` joined via `client_conversions`.
 */
export async function fetchMetaCampaignRowsForReport(
  supabase: SB,
  clientId: string,
  start: string,
  end: string,
  booleans: ChannelMetricMap,
): Promise<CampaignTableRow[]> {
  const rows = await fetchCampaignPerformanceRows(supabase, clientId, "meta", start, end);
  if (!metaCampaignNeedsCustomConversionMetrics(booleans)) return rows;
  return enrichMetaCampaignRowsWithCustomMetrics(supabase, clientId, rows, start, end);
}

/** Sum Contact Forms / Purchases / Purchase Value / ROAS per campaign for the date range. */
export async function enrichMetaCampaignRowsWithCustomMetrics(
  supabase: SB,
  clientId: string,
  rows: CampaignTableRow[],
  start: string,
  end: string,
): Promise<CampaignTableRow[]> {
  if (!rows.length) return rows;

  const { contactFormRawNames, purchaseRawNames } =
    await resolveMetaContactFormAndPurchaseRawNames(supabase, clientId);
  const allRawNames = metaConversionRawNameList({ contactFormRawNames, purchaseRawNames });
  if (!allRawNames.length) return rows;

  const ids = rows.map((r) => r.id);
  const { data: convDaily, error: cdErr } = await supabase
    .from("campaign_conversion_daily")
    .select("campaign_id, event_name, conversions, conversion_value")
    .eq("client_id", clientId)
    .eq("platform", "meta")
    .in("campaign_id", ids)
    .in("event_name", allRawNames)
    .gte("report_date", start)
    .lte("report_date", end);
  if (cdErr) {
    console.warn("[meta-campaign-report] campaign_conversion_daily:", cdErr.message);
    return rows;
  }

  const byCamp = new Map<string, { contactForms: number; purchases: number; purchaseValue: number }>();
  for (const r of convDaily ?? []) {
    const cid = r.campaign_id;
    const cur = byCamp.get(cid) ?? { contactForms: 0, purchases: 0, purchaseValue: 0 };
    const name = (r.event_name ?? "").trim();
    const n = Number(r.conversions ?? 0);
    const v = Number(r.conversion_value ?? 0);
    if (contactFormRawNames.has(name)) cur.contactForms += n;
    if (purchaseRawNames.has(name)) {
      cur.purchases += n;
      cur.purchaseValue += v;
    }
    byCamp.set(cid, cur);
  }

  return rows.map((row) => {
    const m = byCamp.get(row.id);
    if (!m) return row;
    return {
      ...row,
      contactForms: m.contactForms,
      purchases: m.purchases,
      purchaseValue: m.purchaseValue,
      roas: row.cost > 0 ? m.purchaseValue / row.cost : 0,
    };
  });
}
