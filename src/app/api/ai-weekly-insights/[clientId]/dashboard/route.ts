import { NextRequest, NextResponse } from "next/server";
import {
  buildInsightsDashboardPayload,
  GOOGLE_PLATFORMS,
} from "@/lib/ai/insights-dashboard/build-payload";
import { createServiceClient } from "@/lib/supabase/service";

type RouteContext = { params: Promise<{ clientId: string }> };

function defaultRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 5, 1));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { clientId } = await context.params;
  const defaults = defaultRange();
  const dateStart =
    request.nextUrl.searchParams.get("start") ?? defaults.start;
  const dateEnd = request.nextUrl.searchParams.get("end") ?? defaults.end;

  const db = createServiceClient();

  const { data: client, error: clientError } = await db
    .from("clients")
    .select("name, industry, website_url, currency")
    .eq("id", clientId)
    .maybeSingle();

  if (clientError) {
    return NextResponse.json({ error: clientError.message }, { status: 500 });
  }
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const platformFilter = GOOGLE_PLATFORMS.map((p) => `platform.eq.${p}`).join(
    ",",
  );

  const [
    connectionsRes,
    campaignRes,
    searchRes,
    conversionRes,
    campaignsRes,
    ghlRes,
  ] = await Promise.all([
    db
      .from("platform_connections")
      .select("external_account_id, platform")
      .eq("client_id", clientId),
    db
      .from("campaign_daily_performance")
      .select(
        "report_date, campaign_id, spend_cents, clicks, impressions, conversions",
      )
      .eq("client_id", clientId)
      .gte("report_date", dateStart)
      .lte("report_date", dateEnd)
      .or(platformFilter),
    db
      .from("search_term_performance")
      .select(
        "search_term, campaign_name, report_date, spend_cents, clicks, conversions",
      )
      .eq("client_id", clientId)
      .gte("report_date", dateStart)
      .lte("report_date", dateEnd)
      .or(platformFilter),
    db
      .from("conversion_events")
      .select("occurred_on, event_name, event_count")
      .eq("client_id", clientId)
      .gte("occurred_on", dateStart)
      .lte("occurred_on", dateEnd)
      .or(platformFilter),
    db
      .from("campaigns")
      .select("id, campaign_name")
      .eq("client_id", clientId)
      .or(platformFilter),
    db
      .from("ghl_opportunities")
      .select(
        "created_at_ghl, customer_won_date, status, monetary_value, source, utm_source, pipeline_name",
      )
      .eq("client_id", clientId),
  ]);

  if (campaignRes.error) {
    return NextResponse.json({ error: campaignRes.error.message }, { status: 500 });
  }

  const googleConn = (connectionsRes.data ?? []).find((c) =>
    GOOGLE_PLATFORMS.includes(c.platform),
  );

  const campaignNames = new Map<string, string>();
  for (const c of campaignsRes.data ?? []) {
    campaignNames.set(c.id, c.campaign_name);
  }

  const payload = buildInsightsDashboardPayload({
    client,
    googleAdsCustomerId: googleConn?.external_account_id ?? null,
    dateStart,
    dateEnd,
    campaignRows: campaignRes.data ?? [],
    searchRows: searchRes.data ?? [],
    conversionRows: conversionRes.data ?? [],
    campaignNames,
    ghlRows: ghlRes.data ?? [],
  });

  return NextResponse.json(payload);
}
