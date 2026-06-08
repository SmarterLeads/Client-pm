"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { PlatformIcon } from "@/components/marketing/platform-icons";
import { OverviewCard } from "@/components/clients/overview-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateClientOverviewFields,
  updatePlatformConnection,
} from "@/lib/actions/clients";
import {
  configuredPlatformIdEntries,
  editablePlatformIdRows,
  type PlatformIdRowConfig,
} from "@/lib/clients/overview-fields";
import type { ClientPlatformConnection } from "@/lib/queries/clients";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/types";

type ClientOverviewPlatformIdsSectionProps = {
  client: Client;
  connections: ClientPlatformConnection[];
};

export function ClientOverviewPlatformIdsSection({
  client,
  connections,
}: ClientOverviewPlatformIdsSectionProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const editRows = useMemo(
    () => editablePlatformIdRows(client),
    [client],
  );

  const viewEntries = useMemo(
    () => configuredPlatformIdEntries(client, connections),
    [client, connections],
  );

  const connectionMap = useMemo(
    () => new Map(connections.map((row) => [row.platform, row.external_account_id])),
    [connections],
  );

  function buildDraftValues(): Record<string, string> {
    const values: Record<string, string> = {};
    for (const row of editRows) {
      const key = rowKey(row);
      const current =
        row.clientField === "ga4_id"
          ? client.ga4_id
          : connectionMap.get(row.platform);
      values[key] = current?.trim() ?? "";
    }
    return values;
  }

  useEffect(() => {
    if (!isEditing) {
      setDraftValues(buildDraftValues());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, connections, isEditing, editRows]);

  function beginEdit() {
    setDraftValues(buildDraftValues());
    setIsEditing(true);
  }

  function cancelEdit() {
    setDraftValues(buildDraftValues());
    setIsEditing(false);
  }

  function saveEdit() {
    startTransition(async () => {
      for (const row of editRows) {
        const key = rowKey(row);
        const nextValue = draftValues[key]?.trim() ?? "";
        const currentValue =
          row.clientField === "ga4_id"
            ? client.ga4_id?.trim() ?? ""
            : connectionMap.get(row.platform)?.trim() ?? "";

        if (nextValue === currentValue) continue;

        const result =
          row.clientField === "ga4_id"
            ? await updateClientOverviewFields(client.id, {
                ga4_id: nextValue || null,
              })
            : await updatePlatformConnection(
                client.id,
                row.platform,
                nextValue || null,
              );

        if (result.error) {
          toastError(result.error);
          return;
        }
      }

      toastSuccess("Platform IDs saved");
      setIsEditing(false);
      router.refresh();
    });
  }

  return (
    <OverviewCard
      title="Platform IDs"
      headerAction={
        !isEditing ? (
          <Button type="button" variant="outline" size="sm" onClick={beginEdit}>
            Edit
          </Button>
        ) : null
      }
    >
      {isEditing ? (
        <div className="space-y-3 px-1">
          {editRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Select marketing channels to configure ad platform IDs.
            </p>
          ) : (
            editRows.map((row) => (
              <PlatformIdEditRow
                key={rowKey(row)}
                row={row}
                value={draftValues[rowKey(row)] ?? ""}
                disabled={isPending}
                onChange={(value) =>
                  setDraftValues((current) => ({
                    ...current,
                    [rowKey(row)]: value,
                  }))
                }
              />
            ))
          )}

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
      ) : viewEntries.length > 0 ? (
        <ul className="space-y-2 px-1">
          {viewEntries.map((entry) => (
            <li
              key={entry.key}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="text-muted-foreground">{entry.label}</span>
              <span className="font-medium tabular-nums">{entry.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-1 text-sm text-muted-foreground">
          No platform IDs configured
        </p>
      )}
    </OverviewCard>
  );
}

function rowKey(row: PlatformIdRowConfig): string {
  return row.clientField === "ga4_id" ? "ga4_id" : row.platform;
}

function PlatformIdEditRow({
  row,
  value,
  disabled,
  onChange,
}: {
  row: PlatformIdRowConfig;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const iconPlatform =
    row.platform === "ga4"
      ? "ga4"
      : row.platform === "whatconverts"
        ? "whatconverts"
        : row.platform;

  const fieldId = `platform-id-${rowKey(row)}`;

  return (
    <div className={cn("space-y-1.5", disabled && "opacity-60")}>
      <Label htmlFor={fieldId} className="inline-flex items-center gap-2 text-sm">
        <span className="flex size-6 items-center justify-center rounded border border-border bg-background">
          <PlatformIcon platform={iconPlatform} />
        </span>
        {row.label}
      </Label>
      <Input
        id={fieldId}
        value={value}
        disabled={disabled}
        placeholder="Enter ID"
        onChange={(event) => onChange(event.target.value)}
        className="h-9 text-sm"
      />
    </div>
  );
}
