import Anthropic from "@anthropic-ai/sdk";
import { after, NextRequest, NextResponse } from "next/server";
import {
  buildAccountContextMarkdown,
  buildGoogleAdsDataMarkdown,
} from "@/lib/ai/google-ads-data-markdown";
import { assembleWeeklyInsightsPrompt } from "@/lib/ai/assemble-weekly-insights-prompt";
import { buildClientAiInstructionsMarkdown } from "@/lib/ai/build-client-ai-instructions";
import {
  buildPerformanceAuditContext,
  defaultAuditDateRange,
} from "@/lib/ai/build-performance-audit-context";
import { isLiveBrowserAuditPrompt } from "@/lib/ai/smarterleads-audit-prompt";
import { getDefaultClientAiPrompt } from "@/lib/ai/client-ai-prompts-db";
import {
  getDefaultWeekRangesUtc,
  type WeekRange,
} from "@/lib/ai/weekly-insights-weeks";
import { pm } from "@/lib/supabase/pm";
import { createServiceClient } from "@/lib/supabase/service";
import { supabasePM } from "@/lib/supabase-pm";

const GOOGLE_PLATFORM = "google";

type GenerateBody = {
  client_id?: string;
  prompt_id?: string;
  week_start?: string;
  week_end?: string;
  triggered_by?: string;
};

async function runGeneration(params: {
  insightId: string;
  userContent: string;
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    await supabasePM
      .from("client_ai_weekly_insights")
      .update({
        status: "failed",
        error_message: "ANTHROPIC_API_KEY is not configured",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.insightId);
    return;
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 8192,
      messages: [{ role: "user", content: params.userContent }],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    await supabasePM
      .from("client_ai_weekly_insights")
      .update({
        status: "completed",
        report_markdown: text,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.insightId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    await supabasePM
      .from("client_ai_weekly_insights")
      .update({
        status: "failed",
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.insightId);
  }
}

export async function POST(request: NextRequest) {
  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const clientId = body.client_id;
  if (!clientId) {
    return NextResponse.json({ error: "client_id is required" }, { status: 400 });
  }

  const defaults = getDefaultWeekRangesUtc();
  const weekStart = body.week_start ?? defaults.weekStart;
  const weekEnd = body.week_end ?? defaults.weekEnd;

  const trendAnchor = new Date(`${weekStart}T00:00:00.000Z`);
  trendAnchor.setUTCDate(trendAnchor.getUTCDate() - 28);
  const trendStart = trendAnchor.toISOString().slice(0, 10);

  const prevWeekEndDate = new Date(`${weekStart}T00:00:00.000Z`);
  prevWeekEndDate.setUTCDate(prevWeekEndDate.getUTCDate() - 1);
  const prevWeekEnd = prevWeekEndDate.toISOString().slice(0, 10);
  const prevWeekStartDate = new Date(prevWeekEndDate);
  prevWeekStartDate.setUTCDate(prevWeekStartDate.getUTCDate() - 6);
  const prevWeekStart = prevWeekStartDate.toISOString().slice(0, 10);

  const weeks: WeekRange = {
    weekStart,
    weekEnd,
    prevWeekStart,
    prevWeekEnd,
    trendStart,
  };

  const publicDb = createServiceClient();

  const { data: client, error: clientError } = await publicDb
    .from("clients")
    .select(
      "id, name, website_url, industry, marketing_brief, currency, ghl_pipeline_config",
    )
    .eq("id", clientId)
    .maybeSingle();

  if (clientError) {
    return NextResponse.json({ error: clientError.message }, { status: 500 });
  }
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const { data: platformConnections } = await publicDb
    .from("platform_connections")
    .select("platform, external_account_id")
    .eq("client_id", clientId);

  const googleConnection = (platformConnections ?? []).find((c) =>
    ["google", "google_ads"].includes(c.platform),
  );

  const googleAdsCustomerId = googleConnection?.external_account_id ?? null;

  const clientAiPrompt = await getDefaultClientAiPrompt(clientId, "google_ads");

  let promptId = body.prompt_id;
  let promptText: string | undefined;

  if (promptId) {
    const { data: prompt, error: promptError } = await supabasePM
      .from("ai_prompts")
      .select("id, prompt_text")
      .eq("id", promptId)
      .maybeSingle();
    if (promptError) {
      return NextResponse.json({ error: promptError.message }, { status: 500 });
    }
    if (!prompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }
    promptText = prompt.prompt_text;
  } else {
    const { data: defaultPrompt, error: defaultError } = await supabasePM
      .from("ai_prompts")
      .select("id, prompt_text")
      .eq("platform", "google_ads")
      .eq("is_default", true)
      .maybeSingle();

    if (defaultError) {
      return NextResponse.json({ error: defaultError.message }, { status: 500 });
    }
    if (!defaultPrompt) {
      return NextResponse.json(
        { error: "No default google_ads prompt configured" },
        { status: 400 },
      );
    }
    promptId = defaultPrompt.id;
    promptText = defaultPrompt.prompt_text;
  }

  const browserAudit = isLiveBrowserAuditPrompt(promptText);
  const auditRange = defaultAuditDateRange();
  const dataStart = browserAudit ? auditRange.dateStart : trendStart;
  const dataEnd = browserAudit ? auditRange.dateEnd : weekEnd;

  const [campaignRes, searchRes, conversionRes, campaignsRes, ghlLocRes, credRes] =
    await Promise.all([
      publicDb
        .from("campaign_daily_performance")
        .select(
          "report_date, campaign_id, spend_cents, clicks, impressions, conversions",
        )
        .eq("client_id", clientId)
        .gte("report_date", dataStart)
        .lte("report_date", dataEnd)
        .or(`platform.eq.${GOOGLE_PLATFORM},platform.eq.google_ads`),
      publicDb
        .from("search_term_performance")
        .select(
          "search_term, report_date, spend_cents, clicks, impressions, conversions, campaign_name",
        )
        .eq("client_id", clientId)
        .gte("report_date", dataStart)
        .lte("report_date", dataEnd)
        .or(`platform.eq.${GOOGLE_PLATFORM},platform.eq.google_ads`),
      publicDb
        .from("conversion_events")
        .select("occurred_on, event_name, event_count")
        .eq("client_id", clientId)
        .gte("occurred_on", dataStart)
        .lte("occurred_on", dataEnd)
        .or(`platform.eq.${GOOGLE_PLATFORM},platform.eq.google_ads`),
      publicDb
        .from("campaigns")
        .select("id, campaign_name")
        .eq("client_id", clientId)
        .or(`platform.eq.${GOOGLE_PLATFORM},platform.eq.google_ads`),
      publicDb
        .from("ghl_location_keys")
        .select("location_id")
        .eq("client_id", clientId)
        .limit(1),
      pm(publicDb)
        .from("client_credentials")
        .select("url")
        .eq("client_id", clientId)
        .eq("platform", "google_ads")
        .maybeSingle(),
    ]);

  if (campaignRes.error) {
    return NextResponse.json({ error: campaignRes.error.message }, { status: 500 });
  }
  if (searchRes.error) {
    return NextResponse.json({ error: searchRes.error.message }, { status: 500 });
  }
  if (conversionRes.error) {
    return NextResponse.json({ error: conversionRes.error.message }, { status: 500 });
  }

  const clientAiInstructions = buildClientAiInstructionsMarkdown(
    clientAiPrompt?.prompt_text,
    platformConnections ?? [],
    { browserAudit },
  );

  const auditContext = browserAudit
    ? buildPerformanceAuditContext({
        name: client.name,
        industry: client.industry,
        website_url: client.website_url,
        currency: client.currency,
        googleAdsCustomerId,
        googleAdsUrlOverride: credRes.data?.url ?? null,
        ghlLocationId: ghlLocRes.data?.[0]?.location_id ?? null,
        ghl_pipeline_config: client.ghl_pipeline_config,
        dateStart: auditRange.dateStart,
        dateEnd: auditRange.dateEnd,
      })
    : undefined;

  const accountContext = buildAccountContextMarkdown({
    ...client,
    google_ads_customer_id: googleAdsCustomerId,
  });
  const googleAdsMarkdown = buildGoogleAdsDataMarkdown(
    weeks,
    campaignRes.data ?? [],
    searchRes.data ?? [],
    conversionRes.data ?? [],
    campaignsRes.data ?? [],
  );

  const userContent = assembleWeeklyInsightsPrompt(
    promptText!,
    accountContext,
    googleAdsMarkdown,
    weeks,
    clientAiInstructions,
    auditContext,
  );

  const { data: insight, error: insertError } = await supabasePM
    .from("client_ai_weekly_insights")
    .insert({
      client_id: clientId,
      prompt_id: promptId,
      week_start: weekStart,
      week_end: weekEnd,
      prev_week_start: prevWeekStart,
      prev_week_end: prevWeekEnd,
      google_ads_customer_id: googleAdsCustomerId,
      assembled_prompt: userContent,
      status: browserAudit ? "prompt_ready" : "generating",
      generated_by: body.triggered_by ?? null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  if (!browserAudit) {
    after(() =>
      runGeneration({
        insightId: insight.id,
        userContent,
      }),
    );
  }

  return NextResponse.json(insight, { status: 201 });
}
