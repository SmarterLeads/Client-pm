import { parseGhlPipelineConfig } from "@/lib/marketing/report/ghl-pipeline-config";

export type PerformanceAuditContext = {
  clientName: string;
  clientIndustry: string;
  googleAdsUrl: string;
  ghlLocationId: string;
  ghlPipelineName: string;
  websiteUrl: string;
  dateStart: string;
  dateEnd: string;
  currency: string;
  campaignsFilter: string;
  knownEvents: string;
};

function digitsOnly(id: string): string {
  return id.replace(/\D/g, "");
}

export function buildGoogleAdsOverviewUrl(customerId: string | null): string {
  if (!customerId?.trim()) {
    return "(set Google Ads customer ID on platform connection — PM will build ads.google.com URL with ocid)";
  }
  const ocid = digitsOnly(customerId);
  return `https://ads.google.com/aw/campaigns?ocid=${ocid}`;
}

export function defaultAuditDateRange(): { dateStart: string; dateEnd: string } {
  const end = new Date();
  const start = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 5, 1),
  );
  return {
    dateStart: start.toISOString().slice(0, 10),
    dateEnd: end.toISOString().slice(0, 10),
  };
}

export function buildPerformanceAuditContext(input: {
  name: string;
  industry?: string | null;
  website_url?: string | null;
  currency?: string | null;
  googleAdsCustomerId: string | null;
  googleAdsUrlOverride?: string | null;
  ghlLocationId?: string | null;
  ghl_pipeline_config?: unknown;
  knownEvents?: string | null;
  dateStart?: string;
  dateEnd?: string;
}): PerformanceAuditContext {
  const range = defaultAuditDateRange();
  const ghlConfig = parseGhlPipelineConfig(
    input.ghl_pipeline_config as Parameters<typeof parseGhlPipelineConfig>[0],
  );

  return {
    clientName: input.name,
    clientIndustry: input.industry?.trim() || "not set in PM",
    googleAdsUrl:
      input.googleAdsUrlOverride?.trim() ||
      buildGoogleAdsOverviewUrl(input.googleAdsCustomerId),
    ghlLocationId: input.ghlLocationId?.trim() || "not set in PM (check ghl_location_keys)",
    ghlPipelineName:
      ghlConfig?.pipeline_name?.trim() || "Lead pipeline (confirm name in GoHighLevel)",
    websiteUrl: input.website_url?.trim() || "not set in PM",
    dateStart: input.dateStart ?? range.dateStart,
    dateEnd: input.dateEnd ?? range.dateEnd,
    currency: input.currency?.trim()?.toUpperCase() === "USD" ? "USD" : "CAD",
    campaignsFilter: "ALL (exclude removed campaigns at account level; state filters applied)",
    knownEvents: input.knownEvents?.trim() || "none known",
  };
}

const PLACEHOLDER_MAP: Record<keyof PerformanceAuditContext, string> = {
  clientName: "{{CLIENT_NAME}}",
  clientIndustry: "{{CLIENT_INDUSTRY}}",
  googleAdsUrl: "{{GOOGLE_ADS_URL}}",
  ghlLocationId: "{{GHL_LOCATION_ID}}",
  ghlPipelineName: "{{GHL_PIPELINE_NAME}}",
  websiteUrl: "{{WEBSITE_URL}}",
  dateStart: "{{DATE_START}}",
  dateEnd: "{{DATE_END}}",
  currency: "{{CURRENCY}}",
  campaignsFilter: "{{CAMPAIGNS_FILTER}}",
  knownEvents: "{{KNOWN_EVENTS}}",
};

export function applyPerformanceAuditContext(
  promptText: string,
  ctx: PerformanceAuditContext,
): string {
  let out = promptText;
  for (const [key, token] of Object.entries(PLACEHOLDER_MAP) as [
    keyof PerformanceAuditContext,
    string,
  ][]) {
    out = out.replaceAll(token, ctx[key]);
  }
  // Legacy bracket style from SmarterLeads doc
  out = out
    .replaceAll("[CLIENT NAME]", ctx.clientName)
    .replaceAll("[CLIENT, INDUSTRY]", `${ctx.clientName}, ${ctx.clientIndustry}`)
    .replaceAll("[GOOGLE ADS URL]", ctx.googleAdsUrl)
    .replaceAll("[LOCATION ID]", ctx.ghlLocationId)
    .replaceAll("[PIPELINE]", ctx.ghlPipelineName)
    .replaceAll("[WEBSITE]", ctx.websiteUrl)
    .replaceAll("[START DATE]", ctx.dateStart)
    .replaceAll("[END DATE]", ctx.dateEnd)
    .replaceAll("[CAD or USD]", ctx.currency)
    .replaceAll("[ALL, or list]", ctx.campaignsFilter)
    .replaceAll("[LIST, or “none known”]", ctx.knownEvents)
    .replaceAll('[LIST, or "none known"]', ctx.knownEvents);
  return out;
}
