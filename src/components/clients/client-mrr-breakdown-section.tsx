"use client";

import { InlineDollarField } from "@/components/clients/inline-dollar-field";
import { OverviewFieldRow } from "@/components/clients/overview-ui";
import {
  channelMrrCents,
  getMarketingChannelLabel,
  mrrBreakdownMismatchMessage,
  orderedMrrBreakdownChannels,
  parseMrrBreakdown,
  sumMrrBreakdown,
  withChannelMrrCents,
} from "@/lib/clients/mrr-breakdown";
import { formatMrr } from "@/lib/clients/overview-fields";
import type { Client } from "@/lib/types";

type ClientMrrBreakdownSectionProps = {
  client: Client;
  onSaveBreakdown: (
    breakdown: Record<string, number>,
  ) => Promise<{ error?: string }>;
};

export function ClientMrrBreakdownSection({
  client,
  onSaveBreakdown,
}: ClientMrrBreakdownSectionProps) {
  const channels = orderedMrrBreakdownChannels(client.marketing_channels);
  const breakdown = parseMrrBreakdown(client.mrr_breakdown);
  const breakdownTotalCents = sumMrrBreakdown(breakdown);
  const mismatchMessage = mrrBreakdownMismatchMessage(
    breakdownTotalCents,
    client.mrr_cents,
  );

  async function saveChannelMrr(
    channel: string,
    cents: number | null,
  ): Promise<{ error?: string }> {
    const next = withChannelMrrCents(breakdown, channel, cents);
    return onSaveBreakdown(next);
  }

  return (
    <div className="mt-2 border-t border-border pt-3">
      <p className="mb-2 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        MRR Breakdown
      </p>

      {channels.length === 0 ? (
        <p className="px-2 text-sm text-muted-foreground">
          No marketing channels configured.
        </p>
      ) : (
        <div className="space-y-1">
          {channels.map((channel) => (
            <OverviewFieldRow
              key={channel}
              editable
              label={getMarketingChannelLabel(channel)}
            >
              <InlineDollarField
                cents={channelMrrCents(breakdown, channel)}
                aria-label={`${getMarketingChannelLabel(channel)} MRR`}
                onSave={(cents) => saveChannelMrr(channel, cents)}
              />
            </OverviewFieldRow>
          ))}

          <OverviewFieldRow
            label="Breakdown total"
            value={
              <span
                className={
                  mismatchMessage ? "text-amber-600 dark:text-amber-500" : undefined
                }
              >
                {formatMrr(breakdownTotalCents)}
              </span>
            }
          />

          {mismatchMessage ? (
            <p
              className="px-2 pt-1 text-xs text-amber-600 dark:text-amber-500"
              role="status"
            >
              {mismatchMessage}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
