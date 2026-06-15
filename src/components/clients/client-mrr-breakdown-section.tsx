"use client";

import { InlineDollarField } from "@/components/clients/inline-dollar-field";
import { OverviewFieldRow } from "@/components/clients/overview-ui";
import {
  formatHourlyWorkSummary,
  type ClientHourlyWorkSummary,
} from "@/lib/clients/hourly-billing";
import {
  activeMrrBreakdownKeys,
  channelMrrCents,
  getMrrBreakdownItemLabel,
  parseMrrBreakdown,
  withChannelMrrCents,
} from "@/lib/clients/mrr-breakdown";
import { normalizeClientCurrency } from "@/lib/clients/overview-fields";
import type { Client } from "@/lib/types";

type ClientMrrBreakdownSectionProps = {
  client: Client;
  hourlyWork?: ClientHourlyWorkSummary | null;
  onSaveBreakdown: (
    breakdown: Record<string, number>,
  ) => Promise<{ error?: string }>;
};

export function ClientMrrBreakdownSection({
  client,
  hourlyWork,
  onSaveBreakdown,
}: ClientMrrBreakdownSectionProps) {
  const currency = normalizeClientCurrency(client.currency);
  const itemKeys = activeMrrBreakdownKeys(
    client.marketing_channels,
    client.tracking_setup,
  );
  const breakdown = parseMrrBreakdown(client.mrr_breakdown);

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

      {itemKeys.length === 0 && !(client.is_hourly && hourlyWork) ? (
        <p className="px-2 text-sm text-muted-foreground">
          No marketing channels or tracking tools configured.
        </p>
      ) : (
        <div className="space-y-1">
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
                onSave={(cents) => saveChannelMrr(key, cents)}
              />
            </OverviewFieldRow>
          ))}
          {client.is_hourly && hourlyWork ? (
            <OverviewFieldRow label="Hourly Work">
              <span className="px-1 text-sm font-medium tabular-nums">
                {formatHourlyWorkSummary(
                  hourlyWork.billableHours,
                  hourlyWork.hourlyRate,
                  currency,
                )}
              </span>
            </OverviewFieldRow>
          ) : null}
        </div>
      )}
    </div>
  );
}
