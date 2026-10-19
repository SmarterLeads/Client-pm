import type { WeekRange } from "@/lib/ai/weekly-insights-weeks";

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
): string {
  const hasAccount = /\{\{ACCOUNT_CONTEXT\}\}/.test(promptText);
  const hasData = /\{\{GOOGLE_ADS_DATA\}\}/.test(promptText);
  const hasClientInstructions = /\{\{CLIENT_AI_INSTRUCTIONS\}\}/.test(
    promptText,
  );

  let body = promptText;
  if (hasAccount) {
    body = body.replace(/\{\{ACCOUNT_CONTEXT\}\}/g, accountContext);
  }
  if (hasData) {
    body = body.replace(/\{\{GOOGLE_ADS_DATA\}\}/g, googleAdsMarkdown);
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
    parts.push("", googleAdsMarkdown);
  }

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

  return parts.join("\n");
}
