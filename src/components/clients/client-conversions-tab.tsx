"use client";

import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addClientConversionGoal,
  deleteClientConversionGoal,
  updateClientConversionGoal,
} from "@/lib/actions/conversion-goals";
import {
  activeAdConversionChannels,
  compareConversionGoals,
  conversionPlatformSectionLabel,
} from "@/lib/clients/conversion-channels";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ClientConversionGoal } from "@/lib/types";

type ClientConversionsTabProps = {
  clientId: string;
  marketingChannels: string[] | null;
  conversionGoals: ClientConversionGoal[];
};

type ConversionGoalRowProps = {
  clientId: string;
  goal: ClientConversionGoal;
  disabled?: boolean;
};

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatOptionalNumber(value: number | null): string {
  if (value == null) return "";
  return String(value);
}

function ConversionGoalRow({ clientId, goal, disabled }: ConversionGoalRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function saveField(
    updates: Record<string, unknown>,
    successMessage = "Conversion updated",
  ) {
    startTransition(async () => {
      const result = await updateClientConversionGoal({
        id: goal.id,
        clientId,
        ...updates,
      });
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess(successMessage);
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteClientConversionGoal(goal.id, clientId);
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Conversion deleted");
      router.refresh();
    });
  }

  const rowDisabled = disabled || isPending;

  return (
    <TableRow className={cn(rowDisabled && "opacity-60")}>
      <TableCell className="min-w-[10rem] whitespace-normal">
        <Input
          key={`name-${goal.id}-${goal.conversion_name}`}
          defaultValue={goal.conversion_name}
          disabled={rowDisabled}
          aria-label="Conversion name"
          className="h-8 text-sm"
          onBlur={(event) => {
            const next = event.target.value.trim();
            if (!next || next === goal.conversion_name) return;
            saveField({ conversion_name: next });
          }}
        />
      </TableCell>
      <TableCell className="min-w-[10rem] whitespace-normal">
        <Input
          key={`id-${goal.id}-${goal.conversion_id ?? ""}`}
          defaultValue={goal.conversion_id ?? ""}
          disabled={rowDisabled}
          aria-label="Conversion ID"
          className="h-8 text-sm font-mono"
          placeholder="Raw event / action ID"
          onBlur={(event) => {
            const next = event.target.value.trim();
            const current = goal.conversion_id?.trim() ?? "";
            if (next === current) return;
            saveField({ conversion_id: next || null });
          }}
        />
      </TableCell>
      <TableCell className="w-[8.5rem]">
        <select
          key={`priority-${goal.id}-${goal.priority}`}
          defaultValue={goal.priority}
          disabled={rowDisabled}
          aria-label="Priority"
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
          onChange={(event) => {
            const next = event.target.value;
            if (next === goal.priority) return;
            saveField(
              { priority: next },
              next === "primary"
                ? "Marked as primary conversion"
                : "Marked as secondary conversion",
            );
          }}
        >
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
        </select>
      </TableCell>
      <TableCell className="w-[7.5rem]">
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            key={`value-${goal.id}-${goal.conversion_value ?? ""}`}
            type="number"
            min={0}
            step="0.01"
            defaultValue={formatOptionalNumber(goal.conversion_value)}
            disabled={rowDisabled}
            aria-label="Conversion value"
            className="h-8 pl-6 text-sm tabular-nums"
            placeholder="—"
            onBlur={(event) => {
              const next = parseOptionalNumber(event.target.value);
              const current = goal.conversion_value;
              if (next === current || (next == null && current == null)) return;
              saveField({ conversion_value: next });
            }}
          />
        </div>
      </TableCell>
      <TableCell className="min-w-[10rem] whitespace-normal">
        <Input
          key={`notes-${goal.id}-${goal.notes ?? ""}`}
          defaultValue={goal.notes ?? ""}
          disabled={rowDisabled}
          aria-label="Notes"
          className="h-8 text-sm"
          placeholder="Optional notes"
          onBlur={(event) => {
            const next = event.target.value.trim();
            const current = goal.notes?.trim() ?? "";
            if (next === current) return;
            saveField({ notes: next || null });
          }}
        />
      </TableCell>
      <TableCell className="w-[4.5rem] text-right">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={rowDisabled}
          aria-label="Delete conversion"
          onClick={handleDelete}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

type ConversionPlatformSectionProps = {
  clientId: string;
  platform: string;
  label: string;
  goals: ClientConversionGoal[];
};

function ConversionPlatformSection({
  clientId,
  platform,
  label,
  goals,
}: ConversionPlatformSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const sortedGoals = useMemo(
    () => [...goals].sort(compareConversionGoals),
    [goals],
  );

  function handleAddConversion() {
    startTransition(async () => {
      const result = await addClientConversionGoal(clientId, platform);
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Conversion added");
      router.refresh();
    });
  }

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">{label}</h3>
        <span className="text-xs text-muted-foreground">
          {sortedGoals.length}{" "}
          {sortedGoals.length === 1 ? "conversion" : "conversions"}
        </span>
      </div>

      {sortedGoals.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Conversion Name</TableHead>
              <TableHead>Conversion ID</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedGoals.map((goal) => (
              <ConversionGoalRow
                key={goal.id}
                clientId={clientId}
                goal={goal}
                disabled={isPending}
              />
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No conversions configured for {label} yet.
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={handleAddConversion}
      >
        <Plus className="size-4" />
        Add conversion
      </Button>
    </section>
  );
}

export function ClientConversionsTab({
  clientId,
  marketingChannels,
  conversionGoals,
}: ClientConversionsTabProps) {
  const activeChannels = useMemo(
    () => activeAdConversionChannels(marketingChannels),
    [marketingChannels],
  );

  const goalsByPlatform = useMemo(() => {
    const map = new Map<string, ClientConversionGoal[]>();
    for (const goal of conversionGoals) {
      const list = map.get(goal.platform) ?? [];
      list.push(goal);
      map.set(goal.platform, list);
    }
    return map;
  }, [conversionGoals]);

  if (activeChannels.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Conversions</h2>
          <p className="text-sm text-muted-foreground">
            Configure primary and secondary conversion actions for each ad
            platform.
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Add Google Ads, Meta Ads, Microsoft Ads, or TikTok Ads to this
            client&apos;s marketing channels on the Overview tab to configure
            conversions here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Conversions</h2>
        <p className="text-sm text-muted-foreground">
          Primary conversions sync to the marketing dashboard breakdown.
          Changes save automatically when you leave a field.
        </p>
      </div>

      {activeChannels.map((channel) => (
        <ConversionPlatformSection
          key={channel.platform}
          clientId={clientId}
          platform={channel.platform}
          label={conversionPlatformSectionLabel(channel.platform)}
          goals={goalsByPlatform.get(channel.platform) ?? []}
        />
      ))}
    </div>
  );
}
