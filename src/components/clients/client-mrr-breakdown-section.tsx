"use client";

import { InlineDollarField } from "@/components/clients/inline-dollar-field";
import { OverviewFieldRow } from "@/components/clients/overview-ui";
import {
  channelMrrCents,
  getMrrBreakdownItemLabel,
  mrrBreakdownMismatchMessage,
  orderedMrrBreakdownChannels,
  orderedTrackingCrmBreakdownKeys,
  parseMrrBreakdown,
  sumActiveMrrBreakdown,
  withChannelMrrCents,
} from "@/lib/clients/mrr-breakdown";
import {
  formatMrr,
  normalizeClientCurrency,
  type ClientCurrency,
} from "@/lib/clients/overview-fields";
import type { Client } from "@/lib/types";

type ClientMrrBreakdownSectionProps = {
  client: Client;
  onSaveBreakdown: (
    breakdown: Record<string, number>,
  ) => Promise<{ error?: string }>;
};

function BreakdownSubsection({
  title,
  itemKeys,
  breakdown,
  currency,
  onSaveChannel,
}: {
  title: string;
  itemKeys: string[];
  breakdown: ReturnType<typeof parseMrrBreakdown>;
  currency: ClientCurrency;
  onSaveChannel: (key: string, cents: number | null) => Promise<{ error?: string }>;
}) {
  if (itemKeys.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="px-2 pt-2 text-xs font-medium text-muted-foreground">{title}</p>
      {itemKeys.map((key) => (
        <OverviewFieldRow
          key={key}
          editable
          label={getMrrBreakdownItemLabel(key)}
        >
          <InlineDollarField
            cents={channelMrrCents(breakdown, key)}
            currency={currency}
            aria-label={`${getMrrBreakdownItemLabel(key)} MRR`}
            onSave={(cents) => onSaveChannel(key, cents)}
          />
        </OverviewFieldRow>
      ))}
    </div>
  );
}

export function ClientMrrBreakdownSection({
  client,
  onSaveBreakdown,
}: ClientMrrBreakdownSectionProps) {
  const currency = normalizeClientCurrency(client.currency);
  const marketingChannels = orderedMrrBreakdownChannels(client.marketing_channels);
  const trackingKeys = orderedTrackingCrmBreakdownKeys(client.tracking_setup);
  const breakdown = parseMrrBreakdown(client.mrr_breakdown);
  const breakdownTotalCents = sumActiveMrrBreakdown(
    breakdown,
    client.marketing_channels,
    client.tracking_setup,
  );
  const mismatchMessage = mrrBreakdownMismatchMessage(
    breakdownTotalCents,
    client.mrr_cents,
    currency,
  );
  const hasBreakdownItems =
    marketingChannels.length > 0 || trackingKeys.length > 0;

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

      {!hasBreakdownItems ? (
        <p className="px-2 text-sm text-muted-foreground">
          No marketing channels or tracking tools configured.
        </p>
      ) : (
        <div className="space-y-1">
          <BreakdownSubsection
            title="Marketing Channels"
            itemKeys={marketingChannels}
            breakdown={breakdown}
            currency={currency}
            onSaveChannel={saveChannelMrr}
          />
          <BreakdownSubsection
            title="Tracking & CRM"
            itemKeys={trackingKeys}
            breakdown={breakdown}
            currency={currency}
            onSaveChannel={saveChannelMrr}
          />

          <OverviewFieldRow
            label="Total"
            value={
              <span
                className={
                  mismatchMessage ? "text-amber-600 dark:text-amber-500" : undefined
                }
              >
                {formatMrr(breakdownTotalCents, currency)}
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
