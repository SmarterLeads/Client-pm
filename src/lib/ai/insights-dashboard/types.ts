export type Verdict = "Keep" | "Watch" | "Optimise" | "Stop";

export type PeriodMetrics = {
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpa: number | null;
  convRate: number;
};

export type InsightsDashboardPayload = {
  header: {
    clientName: string;
    industry: string | null;
    websiteUrl: string | null;
    currency: string;
    dateStart: string;
    dateEnd: string;
    googleAdsCustomerId: string | null;
    partialMonthNote: string;
    diagnosis: string;
  };
  limitations: string[];
  overview: {
    lastFullMonth: PeriodMetrics;
    priorFullMonth: PeriodMetrics;
    spendChangePct: number | null;
    conversionsChangePct: number | null;
  };
  monthly: Array<PeriodMetrics & { month: string; isPartial: boolean }>;
  weekly: Array<PeriodMetrics & { weekStart: string; weekEnd: string }>;
  campaigns: Array<{
    campaignId: string;
    campaignName: string;
    totals: PeriodMetrics;
    spendSharePct: number;
  }>;
  searchTerms: Array<{
    searchTerm: string;
    campaignName: string;
    spend: number;
    clicks: number;
    conversions: number;
    verdict: Verdict;
    reason: string;
  }>;
  stopWaste: Array<{
    type: string;
    label: string;
    spend: number;
    reason: string;
  }>;
  platformConversionsByMonth: Array<{
    month: string;
    events: Array<{ eventName: string; count: number }>;
    total: number;
  }>;
  crm: {
    pipelineName: string | null;
    leadsByMonth: Array<{ month: string; count: number }>;
    winsByMonth: Array<{ month: string; count: number; value: number }>;
    attributionBuckets: Array<{ bucket: string; wins: number }>;
    totalLeads: number;
    totalWins: number;
  } | null;
};
