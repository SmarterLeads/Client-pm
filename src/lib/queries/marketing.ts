import { weightedAverageRoas } from "@/lib/marketing/format";
import type {
  AgencyReportClientGroup,
  MarketingCampaignRow,
  MarketingClientData,
  MarketingClientRow,
  MarketingDailyPoint,
  MarketingDateBounds,
  MarketingKpiTotals,
  MarketingOverview,
  MarketingPlatformRow,
} from "@/lib/marketing/types";
import { createClient } from "@/lib/supabase/server";

type PerformanceRow = {
  client_id: string;
  platform: string;
  report_date: string;
  spend_cents: number;
  clicks: number;
  impressions: number;
  conversions: number;
  conversion_value_cents: number | null;
  roas: number | null;
};

type ReportClientRow = {
  id: string;
  name: string;
  report_slug: string;
  agency_id: string;
  agencies: { name: string } | null;
};

function emptyTotals(): MarketingKpiTotals {
  return {
    spendCents: 0,
    clicks: 0,
    conversions: 0,
    conversionValueCents: 0,
    averageRoas: null,
    impressions: 0,
  };
}

function aggregateTotals(rows: PerformanceRow[]): MarketingKpiTotals {
  const totals = rows.reduce(
    (acc, row) => {
      acc.spendCents += row.spend_cents ?? 0;
      acc.clicks += row.clicks ?? 0;
      acc.impressions += row.impressions ?? 0;
      acc.conversions += row.conversions ?? 0;
      acc.conversionValueCents += row.conversion_value_cents ?? 0;
      return acc;
    },
    emptyTotals(),
  );

  totals.averageRoas = weightedAverageRoas(
    rows.map((row) => ({
      spendCents: row.spend_cents ?? 0,
      roas: row.roas,
    })),
  );

  return totals;
}

function aggregateByPlatform(rows: PerformanceRow[]): MarketingPlatformRow[] {
  const map = new Map<string, PerformanceRow[]>();

  for (const row of rows) {
    const key = row.platform || "unknown";
    const bucket = map.get(key) ?? [];
    bucket.push(row);
    map.set(key, bucket);
  }

  return [...map.entries()]
    .map(([platform, platformRows]) => {
      const totals = aggregateTotals(platformRows);
      return {
        platform,
        spendCents: totals.spendCents,
        clicks: totals.clicks,
        impressions: totals.impressions,
        conversions: totals.conversions,
        conversionValueCents: totals.conversionValueCents,
        roas: totals.averageRoas,
      };
    })
    .sort((a, b) => b.spendCents - a.spendCents);
}

async function fetchPerformanceInRange(bounds: MarketingDateBounds) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_performance")
    .select(
      "client_id, platform, report_date, spend_cents, clicks, impressions, conversions, conversion_value_cents, roas",
    )
    .gte("report_date", bounds.from)
    .lte("report_date", bounds.to);

  if (error) throw new Error(error.message);
  return (data ?? []) as PerformanceRow[];
}

async function fetchReportClients() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, report_slug, agency_id, agencies(name)")
    .not("report_slug", "is", null)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((row) => row.report_slug?.trim())
    .map((row) => {
      const agency = row.agencies as { name: string } | null;
      return {
        id: row.id,
        name: row.name,
        report_slug: row.report_slug!.trim(),
        agency_id: row.agency_id,
        agencies: agency,
      } satisfies ReportClientRow;
    });
}

export async function getMarketingReportClientGroups(): Promise<
  AgencyReportClientGroup[]
> {
  const clients = await fetchReportClients();
  const groups = new Map<string, AgencyReportClientGroup>();

  for (const client of clients) {
    const agencyName = client.agencies?.name ?? "Unknown agency";
    const existing = groups.get(client.agency_id) ?? {
      agencyId: client.agency_id,
      agencyName,
      clients: [],
    };

    existing.clients.push({
      id: client.id,
      name: client.name,
      reportSlug: client.report_slug,
      agencyId: client.agency_id,
      agencyName,
    });

    groups.set(client.agency_id, existing);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      clients: group.clients.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.agencyName.localeCompare(b.agencyName));
}

export async function getMarketingOverview(
  bounds: MarketingDateBounds,
): Promise<MarketingOverview> {
  const [performance, clients] = await Promise.all([
    fetchPerformanceInRange(bounds),
    fetchReportClients(),
  ]);

  const performanceByClient = new Map<string, PerformanceRow[]>();
  for (const row of performance) {
    const bucket = performanceByClient.get(row.client_id) ?? [];
    bucket.push(row);
    performanceByClient.set(row.client_id, bucket);
  }

  const clientRows: MarketingClientRow[] = clients.map((client) => {
    const rows = performanceByClient.get(client.id) ?? [];
    const totals = aggregateTotals(rows);
    const platforms = [...new Set(rows.map((row) => row.platform))].sort();

    return {
      clientId: client.id,
      clientName: client.name,
      agencyId: client.agency_id,
      agencyName: client.agencies?.name ?? "Unknown agency",
      reportSlug: client.report_slug,
      platforms,
      spendCents: totals.spendCents,
      clicks: totals.clicks,
      conversions: totals.conversions,
      conversionValueCents: totals.conversionValueCents,
      roas: totals.averageRoas,
      hasData: rows.length > 0,
    };
  });

  clientRows.sort((a, b) => b.spendCents - a.spendCents);

  return {
    totals: aggregateTotals(performance),
    byPlatform: aggregateByPlatform(performance),
    clients: clientRows,
  };
}

export async function getClientByReportSlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, report_slug, rag_status, agency_id, agencies(name)")
    .eq("report_slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.report_slug) return null;

  const agency = data.agencies as { name: string } | null;

  return {
    id: data.id,
    name: data.name,
    reportSlug: data.report_slug,
    ragStatus: data.rag_status,
    agencyId: data.agency_id,
    agencyName: agency?.name ?? "Unknown agency",
  };
}

export async function getPlatformBreakdown(
  clientId: string,
  bounds: MarketingDateBounds,
): Promise<MarketingPlatformRow[]> {
  const rows = await fetchClientPerformance(clientId, bounds);
  return aggregateByPlatform(rows);
}

async function fetchClientPerformance(
  clientId: string,
  bounds: MarketingDateBounds,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_performance")
    .select(
      "client_id, platform, report_date, spend_cents, clicks, impressions, conversions, conversion_value_cents, roas",
    )
    .eq("client_id", clientId)
    .gte("report_date", bounds.from)
    .lte("report_date", bounds.to);

  if (error) throw new Error(error.message);
  return (data ?? []) as PerformanceRow[];
}

function aggregateDaily(rows: PerformanceRow[]): MarketingDailyPoint[] {
  const map = new Map<string, MarketingDailyPoint>();

  for (const row of rows) {
    const existing = map.get(row.report_date) ?? {
      date: row.report_date,
      spendCents: 0,
      clicks: 0,
      impressions: 0,
      conversions: 0,
    };

    existing.spendCents += row.spend_cents ?? 0;
    existing.clicks += row.clicks ?? 0;
    existing.impressions += row.impressions ?? 0;
    existing.conversions += row.conversions ?? 0;
    map.set(row.report_date, existing);
  }

  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function getClientCampaigns(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, campaign_name, platform, campaign_type, status")
    .eq("client_id", clientId)
    .order("campaign_name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getClientMarketingData(
  clientId: string,
  bounds: MarketingDateBounds,
): Promise<Omit<MarketingClientData, "client"> | null> {
  const [performance, campaigns] = await Promise.all([
    fetchClientPerformance(clientId, bounds),
    getClientCampaigns(clientId),
  ]);

  const platformTotals = new Map<
    string,
    { spendCents: number; conversions: number }
  >();

  for (const row of performance) {
    const existing = platformTotals.get(row.platform) ?? {
      spendCents: 0,
      conversions: 0,
    };
    existing.spendCents += row.spend_cents ?? 0;
    existing.conversions += row.conversions ?? 0;
    platformTotals.set(row.platform, existing);
  }

  const campaignRows: MarketingCampaignRow[] = campaigns.map((campaign) => {
    const stats = platformTotals.get(campaign.platform) ?? {
      spendCents: 0,
      conversions: 0,
    };

    return {
      id: campaign.id,
      campaignName: campaign.campaign_name,
      platform: campaign.platform,
      campaignType: campaign.campaign_type,
      status: campaign.status,
      spendCents: stats.spendCents,
      conversions: stats.conversions,
    };
  });

  return {
    totals: aggregateTotals(performance),
    daily: aggregateDaily(performance),
    byPlatform: aggregateByPlatform(performance),
    campaigns: campaignRows,
  };
}

export async function getClientMarketingDataBySlug(
  slug: string,
  bounds: MarketingDateBounds,
): Promise<MarketingClientData | null> {
  const client = await getClientByReportSlug(slug);
  if (!client) return null;

  const data = await getClientMarketingData(client.id, bounds);
  if (!data) return null;

  return {
    client,
    ...data,
  };
}

export async function getClientMarketingDataByClientId(
  clientId: string,
  bounds: MarketingDateBounds,
): Promise<MarketingClientData | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, report_slug, rag_status, agency_id, agencies(name)")
    .eq("id", clientId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const agency = data.agencies as { name: string } | null;
  const marketing = await getClientMarketingData(clientId, bounds);
  if (!marketing) return null;

  return {
    client: {
      id: data.id,
      name: data.name,
      reportSlug: data.report_slug ?? "",
      ragStatus: data.rag_status,
      agencyId: data.agency_id,
      agencyName: agency?.name ?? "Unknown agency",
    },
    ...marketing,
  };
}

export type ClientMarketingProfile = {
  reportSlug: string | null;
  clientType: "lead_gen" | "ecommerce";
  leadQualityScore: number | null;
};

export async function getClientMarketingProfile(
  clientId: string,
): Promise<ClientMarketingProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("report_slug, client_type, lead_quality_score")
    .eq("id", clientId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    reportSlug: data.report_slug?.trim() || null,
    clientType: data.client_type === "ecommerce" ? "ecommerce" : "lead_gen",
    leadQualityScore: data.lead_quality_score,
  };
}
