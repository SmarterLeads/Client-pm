"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { updateClientMarketingChannels } from "@/lib/actions/clients";
import {
  MARKETING_CHANNEL_OPTIONS,
  type MarketingChannel,
} from "@/lib/clients/overview-fields";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";

type InlineMarketingChannelsFieldProps = {
  clientId: string;
  value: string[];
  className?: string;
};

export function InlineMarketingChannelsField({
  clientId,
  value,
  className,
}: InlineMarketingChannelsFieldProps) {
  const router = useRouter();
  const [localValue, setLocalValue] = useState<string[]>(value);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  function toggleChannel(channel: MarketingChannel, isChecked: boolean) {
    const currentChannels = value ?? [];
    const newChannels = isChecked
      ? [...currentChannels, channel]
      : currentChannels.filter((item) => item !== channel);

    setLocalValue(newChannels);

    startTransition(async () => {
      const result = await updateClientMarketingChannels(clientId, newChannels);
      if (result.error) {
        toastError(result.error);
        setLocalValue(value);
        return;
      }
      toastSuccess("Marketing channels updated");
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "grid gap-2 sm:grid-cols-2",
        isPending && "opacity-60",
        className,
      )}
    >
      {MARKETING_CHANNEL_OPTIONS.map((option) => {
        const checked = localValue.includes(option.value);
        return (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition hover:bg-muted/40"
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={isPending}
              onChange={(event) =>
                toggleChannel(option.value, event.target.checked)
              }
              className="size-4 rounded border-input"
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}
