import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

type SB = SupabaseClient<Database>;

export type ReportSearchTermsPlatform = "google" | "microsoft";

export type GoogleAdsSearchTermRow = {
  searchTerm: string;
  impressions: number;
  clicks: number;
  ctr: number;
  avgCpc: number;
  spend: number;
  conversions: number;
  costPerLead: number;
};

export type GoogleAdsSearchTermsTableState = {
  rows: GoogleAdsSearchTermRow[];
  /** Rows exist in-range (sync populated data for this window). */
  hasSearchTermRowsInRange: boolean;
  /** Query failed — show same fallback as empty. */
  dataUnavailable?: boolean;
};

function n(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  }
  return 0;
}

function emptyFallback(): GoogleAdsSearchTermsTableState {
  return { rows: [], hasSearchTermRowsInRange: false, dataUnavailable: true };
}

/**
 * Top 10 search terms by summed clicks across the date range (all campaigns combined).
 */
export async function fetchAdsSearchTermsTop10(
  supabase: SB,
  clientId: string,
  start: string,
  end: string,
  platform: ReportSearchTermsPlatform,
): Promise<GoogleAdsSearchTermsTableState> {
  // Google Ads sync no longer populates search_term_performance (Microsoft only).
  if (platform === "google") {
    return { rows: [], hasSearchTermRowsInRange: false, dataUnavailable: false };
  }

  try {
    const { count: headCount, error: cntErr } = await supabase
      .from("search_term_performance")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("platform", platform)
      .gte("report_date", start)
      .lte("report_date", end);

    if (cntErr) {
      console.warn("[ads-search-terms-report] count:", cntErr.message);
      return emptyFallback();
    }
    const hasSearchTermRowsInRange = (headCount ?? 0) > 0;
    if (!hasSearchTermRowsInRange) {
      return { rows: [], hasSearchTermRowsInRange: false, dataUnavailable: false };
    }

    const { data, error } = await supabase
      .from("search_term_performance")
      .select(
        "search_term, impressions, clicks, spend_cents, conversions, ctr, avg_cpc",
      )
      .eq("client_id", clientId)
      .eq("platform", platform)
      .gte("report_date", start)
      .lte("report_date", end);

    if (error) {
      console.warn("[ads-search-terms-report] select:", error.message);
      return emptyFallback();
    }

    type Agg = {
      impressions: number;
      clicks: number;
      spendCents: number;
      conversions: number;
    };
    const byTerm = new Map<string, Agg>();

    for (const r of data ?? []) {
      const term = (r.search_term ?? "").trim();
      if (!term) continue;
      const cur = byTerm.get(term) ?? {
        impressions: 0,
        clicks: 0,
        spendCents: 0,
        conversions: 0,
      };
      cur.impressions += Math.round(n(r.impressions));
      cur.clicks += Math.round(n(r.clicks));
      cur.spendCents += n(r.spend_cents);
      cur.conversions += n(r.conversions);
      byTerm.set(term, cur);
    }

    const rows: GoogleAdsSearchTermRow[] = Array.from(byTerm.entries()).map(
      ([searchTerm, a]) => {
        const spend = a.spendCents / 100;
        const ctr = a.impressions > 0 ? a.clicks / a.impressions : 0;
        const avgCpc = a.clicks > 0 ? spend / a.clicks : 0;
        const costPerLead = a.conversions > 0 ? spend / a.conversions : 0;
        return {
          searchTerm,
          impressions: a.impressions,
          clicks: a.clicks,
          ctr,
          avgCpc,
          spend,
          conversions: a.conversions,
          costPerLead,
        };
      },
    );

    rows.sort((x, y) => y.clicks - x.clicks);

    return {
      rows: rows.slice(0, 10),
      hasSearchTermRowsInRange: true,
      dataUnavailable: false,
    };
  } catch (e) {
    console.warn("[ads-search-terms-report] unexpected:", e);
    return emptyFallback();
  }
}

/** @deprecated Prefer {@link fetchAdsSearchTermsTop10}. */
export async function fetchGoogleAdsSearchTermsTop10(
  supabase: SB,
  clientId: string,
  start: string,
  end: string,
): Promise<GoogleAdsSearchTermsTableState> {
  return fetchAdsSearchTermsTop10(supabase, clientId, start, end, "google");
}
