"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { OverviewCard } from "@/components/clients/overview-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  updateClientMarketingChannels,
  updateClientOverviewFields,
} from "@/lib/actions/clients";
import {
  getMarketingChannelLabel,
  getTrackingSetupLabel,
  MARKETING_CHANNEL_OPTIONS,
  TRACKING_SETUP_OPTIONS,
  type MarketingChannel,
} from "@/lib/clients/overview-fields";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/types";

type ClientOverviewMarketingConfigSectionProps = {
  client: Client;
};

export function ClientOverviewMarketingConfigSection({
  client,
}: ClientOverviewMarketingConfigSectionProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [draftChannels, setDraftChannels] = useState<string[]>([]);
  const [draftTracking, setDraftTracking] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isEditing) {
      setDraftChannels(client.marketing_channels ?? []);
      setDraftTracking(client.tracking_setup ?? "");
    }
  }, [client.marketing_channels, client.tracking_setup, isEditing]);

  function beginEdit() {
    setDraftChannels(client.marketing_channels ?? []);
    setDraftTracking(client.tracking_setup ?? "");
    setIsEditing(true);
  }

  function cancelEdit() {
    setDraftChannels(client.marketing_channels ?? []);
    setDraftTracking(client.tracking_setup ?? "");
    setIsEditing(false);
  }

  function toggleDraftChannel(channel: MarketingChannel, isChecked: boolean) {
    setDraftChannels((current) =>
      isChecked
        ? [...current, channel]
        : current.filter((item) => item !== channel),
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
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Marketing channels
            </Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {MARKETING_CHANNEL_OPTIONS.map((option) => {
                const checked = draftChannels.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition hover:bg-muted/40",
                      isPending && "opacity-60",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isPending}
                      onChange={(event) =>
                        toggleDraftChannel(option.value, event.target.checked)
                      }
                      className="size-4 rounded border-input"
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
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
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Marketing channels</p>
            { (client.marketing_channels ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {(client.marketing_channels ?? []).map((channel) => (
                  <Badge key={channel} variant="secondary">
                    {getMarketingChannelLabel(channel)}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No channels configured
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md px-1 py-1">
            <span className="text-sm text-muted-foreground">Tracking setup</span>
            <span className="text-sm font-medium">
              {getTrackingSetupLabel(client.tracking_setup)}
            </span>
          </div>
        </div>
      )}
    </OverviewCard>
  );
}
