import type { WeekRange } from "@/lib/ai/weekly-insights-weeks";
import {
  applyPerformanceAuditContext,
  type PerformanceAuditContext,
} from "@/lib/ai/build-performance-audit-context";
import {
  isLiveBrowserAuditPrompt,
  USE_LIVE_BROWSER_PULLS,
} from "@/lib/ai/smarterleads-audit-prompt";

/**
 * Merges the DB prompt template with fetched account/ads markdown.
 * If placeholders are omitted, appends data blocks so legacy prompts still work.
 */
export function assembleWeeklyInsightsPrompt(
  promptText: string,
  accountContext: string,
  googleAdsMarkdown: string,
  weeks: WeekRange,
  clientAiInstructions: string,
  auditContext?: PerformanceAuditContext,
): string {
  const browserAudit = isLiveBrowserAuditPrompt(promptText);

  let body = promptText.replaceAll(USE_LIVE_BROWSER_PULLS, "").trim();

  if (auditContext) {
    body = applyPerformanceAuditContext(body, auditContext);
  }

  const hasAccount = /\{\{ACCOUNT_CONTEXT\}\}/.test(body);
  const hasData = new RegExp(
    `\\{\\{(${browserAudit ? "PM_SUPPLEMENTAL_DATA" : "GOOGLE_ADS_DATA"})\\}\\}`,
  ).test(body);
  const hasClientInstructions = /\{\{CLIENT_AI_INSTRUCTIONS\}\}/.test(body);

  if (hasAccount) {
    body = body.replace(/\{\{ACCOUNT_CONTEXT\}\}/g, accountContext);
  }
  if (hasData) {
    body = body.replace(
      new RegExp(`\\{\\{${browserAudit ? "PM_SUPPLEMENTAL_DATA" : "GOOGLE_ADS_DATA"}\\}\\}`, "g"),
      wrapPmSupplementalBlock(googleAdsMarkdown, browserAudit),
    );
  }
  // Legacy weekly prompts may still use GOOGLE_ADS_DATA in browser template edge cases
  if (browserAudit && /\{\{GOOGLE_ADS_DATA\}\}/.test(body)) {
    body = body.replace(
      /\{\{GOOGLE_ADS_DATA\}\}/g,
      wrapPmSupplementalBlock(googleAdsMarkdown, true),
    );
  }
  if (hasClientInstructions) {
    body = body.replace(
      /\{\{CLIENT_AI_INSTRUCTIONS\}\}/g,
      clientAiInstructions,
    );
  }

  const parts: string[] = [body.trim()];

  if (!hasClientInstructions) {
    parts.push("", clientAiInstructions);
  }
  if (!hasAccount) {
    parts.push("", accountContext);
  }
  if (!hasData) {
    parts.push("", wrapPmSupplementalBlock(googleAdsMarkdown, browserAudit));
  }

  if (browserAudit) {
    parts.push(
      "",
      "---",
      "",
      "**Execution (required):** Pull **all** Section 3 data using the **browser** from Google Ads, GoHighLevel, and the website. PM supplemental blocks above are **incomplete sync subsets** — use them only to cross-check after your live pulls, never as the sole source.",
      "",
      "Build and **publish** the interactive **Dashboard** artifact (SmarterLeads performance diagnosis layout). Return the **published artifact URL**, CSV file list, tie-out notes, limitations, and a 2–3 sentence executive summary. Do **not** ask the user to paste exports or wait for more input before starting browser research.",
    );
  } else {
    parts.push(
      "",
      "## Reporting period (UTC)",
      "",
      `- **Current week:** ${weeks.weekStart} – ${weeks.weekEnd}`,
      `- **Previous week:** ${weeks.prevWeekStart} – ${weeks.prevWeekEnd}`,
      "",
      "---",
      "",
      "**Instructions:** The account context and Google Ads performance data above were loaded automatically from our database. Do not ask the user to paste exports, confirm parameters, or wait for more input. Using only the data provided, produce the complete weekly audit report now in markdown. If metrics are sparse or missing, note limitations in the report and still deliver your analysis.",
    );
  }

  return parts.join("\n");
}

function wrapPmSupplementalBlock(markdown: string, browserAudit: boolean): string {
  if (!browserAudit) return markdown;
  return [
    "## PM supplemental data (incomplete — browser pulls required)",
    "",
    "_Synced subset from PM tables. Missing: auction insights, change history, ad/headline/LP month detail, Google Recommendations, full search-term grids, and live CRM/website checks._",
    "",
    markdown.trim(),
  ].join("\n");
}
