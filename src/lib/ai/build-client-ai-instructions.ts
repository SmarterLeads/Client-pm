import type { ClientPlatformConnection } from "@/lib/queries/clients";

export function buildClientAiInstructionsMarkdown(
  promptText: string | null | undefined,
  connections: Pick<
    ClientPlatformConnection,
    "platform" | "external_account_id"
  >[],
): string {
  const lines: string[] = ["## Client-specific AI instructions", ""];

  if (promptText?.trim()) {
    lines.push(promptText.trim());
  } else {
    lines.push(
      "_No client-specific instructions saved. Add them on the client **AI Prompts** tab._",
    );
  }

  const linked = connections.filter(
    (c) => c.external_account_id?.trim() || c.platform,
  );
  if (linked.length > 0) {
    lines.push("", "### Linked ad accounts (PM database)", "");
    for (const c of linked) {
      lines.push(
        `- **${c.platform}**${c.external_account_id ? `: account ID \`${c.external_account_id}\`` : ""}`,
      );
    }
    lines.push(
      "",
      "Performance metrics in this report are loaded from `public.campaign_daily_performance`, `public.search_term_performance`, and `public.conversion_events` filtered by this client's `client_id` and Google platform.",
    );
  }

  return lines.join("\n");
}
