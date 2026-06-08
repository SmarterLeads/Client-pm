"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { OverviewCard } from "@/components/clients/overview-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateClientMarketingChannels,
  updateClientOverviewFields,
  updatePlatformConnection,
} from "@/lib/actions/clients";
import {
  getMarketingChannelLabel,
  getTrackingSetupLabel,
  MARKETING_CHANNEL_OPTIONS,
  platformIdConfigForChannel,
  trackingPlatformIdRows,
  TRACKING_SETUP_OPTIONS,
  type MarketingChannel,
  type PlatformIdRowConfig,
} from "@/lib/clients/overview-fields";
import type { ClientPlatformConnection } from "@/lib/queries/clients";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/types";

type ClientOverviewMarketingConfigSectionProps = {
  client: Client;
  connections: ClientPlatformConnection[];
};

type DraftPlatformIds = Record<string, string>;

function platformDraftKey(platform: string, clientField?: "ga4_id") {
  return clientField === "ga4_id" ? "ga4_id" : platform;
}

function buildPlatformDraftValues(
  client: Client,
  connectionMap: Map<string, string | null>,
): DraftPlatformIds {
  const values: DraftPlatformIds = {};

  for (const option of MARKETING_CHANNEL_OPTIONS) {
    const config = platformIdConfigForChannel(option.value);
    if (!config) continue;
    const key = platformDraftKey(config.platform, config.clientField);
    values[key] =
      config.clientField === "ga4_id"
        ? client.ga4_id?.trim() ?? ""
        : connectionMap.get(config.platform)?.trim() ?? "";
  }

  for (const setup of TRACKING_SETUP_OPTIONS) {
    for (const row of trackingPlatformIdRows(setup.value)) {
      values[row.platform] = connectionMap.get(row.platform)?.trim() ?? "";
    }
  }

  return values;
}

export function ClientOverviewMarketingConfigSection({
  client,
  connections,
}: ClientOverviewMarketingConfigSectionProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [draftChannels, setDraftChannels] = useState<string[]>([]);
  const [draftTracking, setDraftTracking] = useState("");
  const [draftPlatformIds, setDraftPlatformIds] = useState<DraftPlatformIds>({});
  const [isPending, startTransition] = useTransition();

  const connectionMap = useMemo(
    () =>
      new Map(
        connections.map((row) => [row.platform, row.external_account_id]),
      ),
    [connections],
  );

  const activeTrackingRows = useMemo(
    () => trackingPlatformIdRows(draftTracking || client.tracking_setup),
    [draftTracking, client.tracking_setup],
  );

  function resetDrafts() {
    setDraftChannels(client.marketing_channels ?? []);
    setDraftTracking(client.tracking_setup ?? "");
    setDraftPlatformIds(buildPlatformDraftValues(client, connectionMap));
  }

  useEffect(() => {
    if (!isEditing) resetDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    client.marketing_channels,
    client.tracking_setup,
    client.ga4_id,
    connections,
    isEditing,
  ]);

  function beginEdit() {
    resetDrafts();
    setIsEditing(true);
  }

  function cancelEdit() {
    resetDrafts();
    setIsEditing(false);
  }

  function toggleDraftChannel(channel: MarketingChannel, isChecked: boolean) {
    setDraftChannels((current) =>
      isChecked
        ? [...current, channel]
        : current.filter((item) => item !== channel),
    );
  }

  function setDraftPlatformId(key: string, value: string) {
    setDraftPlatformIds((current) => ({ ...current, [key]: value }));
  }

  function currentPlatformId(
    config: NonNullable<ReturnType<typeof platformIdConfigForChannel>>,
  ): string {
    if (config.clientField === "ga4_id") {
      return client.ga4_id?.trim() ?? "";
    }
    return connectionMap.get(config.platform)?.trim() ?? "";
  }

  async function savePlatformIdChanges(
    config: NonNullable<ReturnType<typeof platformIdConfigForChannel>>,
    nextValue: string,
  ): Promise<{ error?: string } | undefined> {
    const currentValue = currentPlatformId(config);
    if (nextValue === currentValue) return;

    if (config.clientField === "ga4_id") {
      return updateClientOverviewFields(client.id, {
        ga4_id: nextValue || null,
      });
    }

    return updatePlatformConnection(
      client.id,
      config.platform,
      nextValue || null,
    );
  }

  async function saveTrackingPlatformId(
    row: PlatformIdRowConfig,
    nextValue: string,
  ): Promise<{ error?: string } | undefined> {
    const currentValue = connectionMap.get(row.platform)?.trim() ?? "";
    if (nextValue === currentValue) return;

    return updatePlatformConnection(
      client.id,
      row.platform,
      nextValue || null,
    );
  }

  function saveEdit() {
    startTransition(async () => {
      const channelsResult = await updateClientMarketingChannels(
        client.id,
        draftChannels,
      );

      if (channelsResult.error) {
        toastError(channelsResult.error);
        return;
      }

      const trackingResult = await updateClientOverviewFields(client.id, {
        tracking_setup: draftTracking ? draftTracking : null,
      });

      if (trackingResult.error) {
        toastError(trackingResult.error);
        return;
      }

      for (const option of MARKETING_CHANNEL_OPTIONS) {
        if (!draftChannels.includes(option.value)) continue;
        const config = platformIdConfigForChannel(option.value);
        if (!config) continue;

        const key = platformDraftKey(config.platform, config.clientField);
        const result = await savePlatformIdChanges(
          config,
          draftPlatformIds[key]?.trim() ?? "",
        );
        if (result?.error) {
          toastError(result.error);
          return;
        }
      }

      for (const row of trackingPlatformIdRows(draftTracking)) {
        const result = await saveTrackingPlatformId(
          row,
          draftPlatformIds[row.platform]?.trim() ?? "",
        );
        if (result?.error) {
          toastError(result.error);
          return;
        }
      }

      toastSuccess("Marketing configuration saved");
      setIsEditing(false);
      router.refresh();
    });
  }

  return (
    <OverviewCard
      title="Marketing Configuration"
      headerAction={
        !isEditing ? (
          <Button type="button" variant="outline" size="sm" onClick={beginEdit}>
            Edit
          </Button>
        ) : null
      }
    >
      {isEditing ? (
        <div className="space-y-4 px-1">
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">
              Marketing channels
            </Label>
            <ul className="divide-y divide-border rounded-md border border-border">
              {MARKETING_CHANNEL_OPTIONS.map((option) => {
                const checked = draftChannels.includes(option.value);
                const platformConfig = platformIdConfigForChannel(option.value);
                const platformKey = platformConfig
                  ? platformDraftKey(
                      platformConfig.platform,
                      platformConfig.clientField,
                    )
                  : null;

                return (
                  <li
                    key={option.value}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5",
                      isPending && "opacity-60",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isPending}
                      aria-label={`Enable ${option.label}`}
                      onChange={(event) =>
                        toggleDraftChannel(option.value, event.target.checked)
                      }
                      className="size-4 shrink-0 rounded border-input"
                    />
                    <span className="min-w-0 flex-1 text-sm">{option.label}</span>
                    {checked && platformKey ? (
                      <Input
                        value={draftPlatformIds[platformKey] ?? ""}
                        disabled={isPending}
                        placeholder="Platform ID"
                        aria-label={`${option.label} platform ID`}
                        onChange={(event) =>
                          setDraftPlatformId(platformKey, event.target.value)
                        }
                        className="h-8 max-w-[14rem] shrink-0 text-sm tabular-nums"
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tracking-setup" className="text-sm text-muted-foreground">
              Tracking setup
            </Label>
            <select
              id="tracking-setup"
              value={draftTracking}
              disabled={isPending}
              onChange={(event) => setDraftTracking(event.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm dark:bg-input/30"
            >
              <option value="">Not set</option>
              {TRACKING_SETUP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {trackingPlatformIdRows(draftTracking).length > 0 ? (
            <ul className="divide-y divide-border rounded-md border border-border">
              {trackingPlatformIdRows(draftTracking).map((row) => (
                <li
                  key={row.platform}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5",
                    isPending && "opacity-60",
                  )}
                >
                  <span className="size-4 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1 text-sm">{row.label.replace(/ ID$/, "")}</span>
                  <Input
                    value={draftPlatformIds[row.platform] ?? ""}
                    disabled={isPending}
                    placeholder="Platform ID"
                    aria-label={row.label}
                    onChange={(event) =>
                      setDraftPlatformId(row.platform, event.target.value)
                    }
                    className="h-8 max-w-[14rem] shrink-0 text-sm tabular-nums"
                  />
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button type="button" size="sm" disabled={isPending} onClick={saveEdit}>
              {isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={cancelEdit}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 px-1">
          {(client.marketing_channels ?? []).length > 0 ? (
            <ul className="divide-y divide-border rounded-md border border-border">
              {(client.marketing_channels ?? []).map((channel) => {
                const label = getMarketingChannelLabel(channel);
                const platformConfig = platformIdConfigForChannel(
                  channel as MarketingChannel,
                );
                const platformId = platformConfig
                  ? currentPlatformId(platformConfig)
                  : null;

                return (
                  <li
                    key={channel}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                  >
                    <span>{label}</span>
                    {platformConfig ? (
                      <span className="font-medium tabular-nums text-muted-foreground">
                        {platformId || "—"}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No channels configured
            </p>
          )}

          <div className="flex items-center justify-between gap-3 rounded-md px-1 py-1">
            <span className="text-sm text-muted-foreground">Tracking setup</span>
            <span className="text-sm font-medium">
              {getTrackingSetupLabel(client.tracking_setup)}
            </span>
          </div>

          {activeTrackingRows.length > 0 ? (
            <ul className="divide-y divide-border rounded-md border border-border">
              {activeTrackingRows.map((row) => {
                const value = connectionMap.get(row.platform)?.trim();
                if (!value) return null;
                return (
                  <li
                    key={row.platform}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                  >
                    <span>{row.label.replace(/ ID$/, "")}</span>
                    <span className="font-medium tabular-nums">{value}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      )}
    </OverviewCard>
  );
}
