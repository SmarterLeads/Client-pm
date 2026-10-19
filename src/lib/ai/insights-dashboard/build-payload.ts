import type {
  InsightsDashboardPayload,
  PeriodMetrics,
  Verdict,
} from "@/lib/ai/insights-dashboard/types";

const GOOGLE_PLATFORMS = ["google", "google_ads"];

type CampaignRow = {
  report_date: string;
  campaign_id: string;
  spend_cents: number | null;
  clicks: number | null;
  impressions: number | null;
  conversions: number | null;
};

type SearchRow = {
  search_term: string;
  campaign_name: string;
  report_date: string;
  spend_cents: number;
  clicks: number;
  conversions: number;
};

type ConvRow = {
  occurred_on: string;
  event_name: string;
  event_count: number;
};

type GhlRow = {
  created_at_ghl: string | null;
  customer_won_date: string | null;
  status: string | null;
  monetary_value: number | null;
  source: string | null;
  utm_source: string | null;
  pipeline_name: string | null;
};

function metricsFromRows(rows: CampaignRow[]): PeriodMetrics {
  let spend = 0;
  let clicks = 0;
  let impressions = 0;
  let conversions = 0;
  for (const r of rows) {
    spend += (r.spend_cents ?? 0) / 100;
    clicks += r.clicks ?? 0;
    impressions += r.impressions ?? 0;
    conversions += r.conversions ?? 0;
  }
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const convRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
  const cpa = conversions > 0 ? spend / conversions : null;
  return { spend, clicks, impressions, conversions, ctr, cpc, cpa, convRate };
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function lastDayOfMonth(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function isPartialMonth(ym: string, rangeEnd: string): boolean {
  const todayYm = rangeEnd.slice(0, 7);
  if (ym !== todayYm) return false;
  const endDay = Number(rangeEnd.slice(8, 10));
  return endDay < lastDayOfMonth(ym);
}

function pctChange(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / prev) * 100;
}

function mondayWeekStart(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  const dow = d.getUTCDay();
  const diff = dow === 0 ? 6 : dow - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

function verdictForTerm(
  spend: number,
  clicks: number,
  conversions: number,
  accountCpa: number | null,
): { verdict: Verdict; reason: string } {
  if (spend >= 50 && conversions === 0) {
    return { verdict: "Stop", reason: "High spend with zero conversions" };
  }
  if (conversions > 0 && accountCpa != null && spend / conversions > accountCpa * 2.5) {
    return { verdict: "Stop", reason: "CPA well above account average" };
  }
  if (conversions >= 2) {
    return { verdict: "Keep", reason: "Converting term" };
  }
  if (conversions === 1) {
    return { verdict: "Watch", reason: "Limited conversion volume" };
  }
  if (spend >= 15 || clicks >= 10) {
    return { verdict: "Optimise", reason: "Spend/clicks without conversions — review match and landing page" };
  }
  return { verdict: "Watch", reason: "Low volume" };
}

function attributionBucket(source: string | null, utm: string | null): string {
  const s = (source ?? "").toLowerCase();
  const u = (utm ?? "").toLowerCase();
  if (s.includes("cpc") || u.includes("cpc") || u.includes("google")) return "cpc / Google";
  if (!s.trim() && !u.trim()) return "Blank";
  if (s.includes("crm") || u.includes("crm")) return "CRM";
  return "Other";
}

export function buildInsightsDashboardPayload(params: {
  client: {
    name: string;
    industry: string | null;
    website_url: string | null;
    currency: string;
  };
  googleAdsCustomerId: string | null;
  dateStart: string;
  dateEnd: string;
  campaignRows: CampaignRow[];
  searchRows: SearchRow[];
  conversionRows: ConvRow[];
  campaignNames: Map<string, string>;
  ghlRows: GhlRow[];
}): InsightsDashboardPayload {
  const {
    client,
    googleAdsCustomerId,
    dateStart,
    dateEnd,
    campaignRows,
    searchRows,
    conversionRows,
    campaignNames,
    ghlRows,
  } = params;

  const accountTotals = metricsFromRows(campaignRows);
  const accountCpa = accountTotals.cpa;

  const months = new Set<string>();
  for (const r of campaignRows) months.add(monthKey(r.report_date));
  const sortedMonths = [...months].sort();

  const monthly = sortedMonths.map((month) => {
    const rows = campaignRows.filter((r) => monthKey(r.report_date) === month);
    return {
      month,
      isPartial: isPartialMonth(month, dateEnd),
      ...metricsFromRows(rows),
    };
  });

  const fullMonths = monthly.filter((m) => !m.isPartial);
  const lastFullMonth = fullMonths.at(-1) ?? metricsFromRows([]);
  const priorFullMonth = fullMonths.at(-2) ?? metricsFromRows([]);

  const weekMap = new Map<string, CampaignRow[]>();
  for (const r of campaignRows) {
    const ws = mondayWeekStart(r.report_date);
    const list = weekMap.get(ws) ?? [];
    list.push(r);
    weekMap.set(ws, list);
  }
  const weekly = [...weekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, rows]) => {
      const end = new Date(`${weekStart}T00:00:00.000Z`);
      end.setUTCDate(end.getUTCDate() + 6);
      return {
        weekStart,
        weekEnd: end.toISOString().slice(0, 10),
        ...metricsFromRows(rows),
      };
    });

  const campaignIds = new Set(campaignRows.map((r) => r.campaign_id));
  const campaigns = [...campaignIds].map((id) => {
    const rows = campaignRows.filter((r) => r.campaign_id === id);
    const totals = metricsFromRows(rows);
    return {
      campaignId: id,
      campaignName: campaignNames.get(id) ?? id,
      totals,
      spendSharePct:
        accountTotals.spend > 0 ? (totals.spend / accountTotals.spend) * 100 : 0,
    };
  });
  campaigns.sort((a, b) => b.totals.spend - a.totals.spend);

  const termMap = new Map<
    string,
    { campaignName: string; spend: number; clicks: number; conversions: number }
  >();
  for (const r of searchRows) {
    const key = `${r.search_term}|||${r.campaign_name}`;
    const t = termMap.get(key) ?? {
      campaignName: r.campaign_name,
      spend: 0,
      clicks: 0,
      conversions: 0,
    };
    t.spend += r.spend_cents / 100;
    t.clicks += r.clicks;
    t.conversions += r.conversions;
    termMap.set(key, t);
  }

  const searchTerms = [...termMap.entries()]
    .map(([key, t]) => {
      const searchTerm = key.split("|||")[0]!;
      const { verdict, reason } = verdictForTerm(
        t.spend,
        t.clicks,
        t.conversions,
        accountCpa,
      );
      return {
        searchTerm,
        campaignName: t.campaignName,
        spend: t.spend,
        clicks: t.clicks,
        conversions: t.conversions,
        verdict,
        reason,
      };
    })
    .filter((t) => t.spend >= 15 || t.clicks >= 10)
    .sort((a, b) => b.spend - a.spend);

  const stopWaste = searchTerms
    .filter((t) => t.verdict === "Stop")
    .map((t) => ({
      type: "Search term",
      label: `${t.searchTerm} (${t.campaignName})`,
      spend: t.spend,
      reason: t.reason,
    }));

  const convByMonth = new Map<string, Map<string, number>>();
  for (const r of conversionRows) {
    const m = monthKey(r.occurred_on);
    const inner = convByMonth.get(m) ?? new Map();
    inner.set(r.event_name, (inner.get(r.event_name) ?? 0) + r.event_count);
    convByMonth.set(m, inner);
  }
  const platformConversionsByMonth = [...convByMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, eventsMap]) => {
      const events = [...eventsMap.entries()].map(([eventName, count]) => ({
        eventName,
        count,
      }));
      return {
        month,
        events,
        total: events.reduce((s, e) => s + e.count, 0),
      };
    });

  let crm: InsightsDashboardPayload["crm"] = null;
  if (ghlRows.length > 0) {
    const leadsByMonthMap = new Map<string, number>();
    const winsByMonthMap = new Map<string, { count: number; value: number }>();
    const attrMap = new Map<string, number>();
    let totalWins = 0;

    for (const row of ghlRows) {
      const created = row.created_at_ghl?.slice(0, 10);
      if (created && created >= dateStart && created <= dateEnd) {
        const m = monthKey(created);
        leadsByMonthMap.set(m, (leadsByMonthMap.get(m) ?? 0) + 1);
      }
      const won = row.customer_won_date?.slice(0, 10);
      const isWon =
        row.status?.toLowerCase() === "won" || Boolean(won);
      if (isWon) {
        totalWins += 1;
        const wm = won ? monthKey(won) : created ? monthKey(created) : "unknown";
        const cur = winsByMonthMap.get(wm) ?? { count: 0, value: 0 };
        cur.count += 1;
        cur.value += row.monetary_value ?? 0;
        winsByMonthMap.set(wm, cur);
        const bucket = attributionBucket(row.source, row.utm_source);
        attrMap.set(bucket, (attrMap.get(bucket) ?? 0) + 1);
      }
    }

    crm = {
      pipelineName: ghlRows.find((r) => r.pipeline_name)?.pipeline_name ?? null,
      leadsByMonth: [...leadsByMonthMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count })),
      winsByMonth: [...winsByMonthMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, v]) => ({ month, count: v.count, value: v.value })),
      attributionBuckets: [...attrMap.entries()].map(([bucket, wins]) => ({
        bucket,
        wins,
      })),
      totalLeads: [...leadsByMonthMap.values()].reduce((a, b) => a + b, 0),
      totalWins,
    };
  }

  const spendCh = pctChange(lastFullMonth.spend, priorFullMonth.spend);
  const convCh = pctChange(lastFullMonth.conversions, priorFullMonth.conversions);

  let diagnosis =
    "Insufficient synced Google Ads history to diagnose trends — confirm data sync for this client.";
  if (fullMonths.length >= 2) {
    const spendPart =
      spendCh == null ? "spend changed" : `spend ${spendCh >= 0 ? "up" : "down"} ${Math.abs(spendCh).toFixed(0)}%`;
    const convPart =
      convCh == null
        ? "conversions moved"
        : `conversions ${convCh >= 0 ? "up" : "down"} ${Math.abs(convCh).toFixed(0)}%`;
    diagnosis = `Comparing the last two full months in PM-synced data: ${spendPart}, ${convPart}. Review Stop waste and CRM vs platform conversion tabs first.`;
  }

  const partialMonthNote =
    monthly.some((m) => m.isPartial)
      ? `Current month (${dateEnd.slice(0, 7)}) is partial through ${dateEnd}. Partial months are excluded from month-over-month rankings.`
      : "All months in range are complete calendar months.";

  const limitations = [
    "Dashboard uses PM database sync (Google Ads daily + search terms + conversion events), not live Google Ads UI exports.",
    "Auction insights, change history, ad copy ratings, landing page reports, and Google Recommendations tab are not in this dashboard until synced to PM.",
    "GoHighLevel CRM wins and platform conversions are shown separately — do not treat them as the same metric.",
    "Search term verdicts are rule-based helpers; confirm in Google Ads before pausing.",
    "Impression share and lost share are not available in this view unless added to sync.",
  ];

  return {
    header: {
      clientName: client.name,
      industry: client.industry,
      websiteUrl: client.website_url,
      currency: client.currency,
      dateStart,
      dateEnd,
      googleAdsCustomerId,
      partialMonthNote,
      diagnosis,
    },
    limitations,
    overview: {
      lastFullMonth,
      priorFullMonth,
      spendChangePct: spendCh,
      conversionsChangePct: convCh,
    },
    monthly,
    weekly,
    campaigns,
    searchTerms,
    stopWaste,
    platformConversionsByMonth,
    crm,
  };
}

export { GOOGLE_PLATFORMS };
