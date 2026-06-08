export const MARKETING_DATE_RANGES = [
  "this_month",
  "last_month",
  "last_30_days",
  "last_90_days",
] as const;

export type MarketingDateRange = (typeof MARKETING_DATE_RANGES)[number];

export type MarketingDateBounds = {
  from: string;
  to: string;
  range: MarketingDateRange;
};

export type MarketingKpiTotals = {
  spendCents: number;
  clicks: number;
  conversions: number;
  conversionValueCents: number;
  averageRoas: number | null;
  impressions: number;
};

export type MarketingPlatformRow = {
  platform: string;
  spendCents: number;
  clicks: number;
  impressions: number;
  conversions: number;
  conversionValueCents: number;
  roas: number | null;
};

export type MarketingClientRow = {
  clientId: string;
  clientName: string;
  agencyId: string;
  agencyName: string;
  reportSlug: string;
  platforms: string[];
  spendCents: number;
  clicks: number;
  conversions: number;
  conversionValueCents: number;
  roas: number | null;
  hasData: boolean;
};

export type MarketingOverview = {
  totals: MarketingKpiTotals;
  byPlatform: MarketingPlatformRow[];
  clients: MarketingClientRow[];
};

export type MarketingDailyPoint = {
  date: string;
  spendCents: number;
  clicks: number;
  impressions: number;
  conversions: number;
};

export type MarketingCampaignRow = {
  id: string;
  campaignName: string;
  platform: string;
  campaignType: string | null;
  status: string | null;
  spendCents: number;
  conversions: number;
};

export type MarketingClientData = {
  client: {
    id: string;
    name: string;
    reportSlug: string;
    ragStatus: string;
    agencyId: string;
    agencyName: string;
  };
  totals: MarketingKpiTotals;
  daily: MarketingDailyPoint[];
  byPlatform: MarketingPlatformRow[];
  campaigns: MarketingCampaignRow[];
};

export type MarketingReportClient = {
  id: string;
  name: string;
  reportSlug: string;
  agencyId: string;
  agencyName: string;
};

export type AgencyReportClientGroup = {
  agencyId: string;
  agencyName: string;
  clients: MarketingReportClient[];
};
