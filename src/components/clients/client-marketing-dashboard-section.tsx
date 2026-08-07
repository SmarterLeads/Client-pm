"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { OverviewCard } from "@/components/clients/overview-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateClientMarketingDashboard } from "@/lib/actions/clients";
import { CREATE_CLIENT_PLATFORM_FIELDS } from "@/lib/clients/create-client-platforms";
import { slugifyClientName } from "@/lib/clients/report-slug";
import type { ClientPlatformConnection } from "@/lib/queries/clients";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/types";

type ClientMarketingDashboardSectionProps = {
  client: Client;
  connections: ClientPlatformConnection[];
};

type PlatformDraft = Record<string, string>;

function buildInitialDraft(
  client: Client,
  connectionMap: Map<string, string | null>,
): {
  showInDashboard: boolean;
  reportSlug: string;
  platformIds: PlatformDraft;
} {
  const platformIds: PlatformDraft = {};

  for (const field of CREATE_CLIENT_PLATFORM_FIELDS) {
    if (field.formKey === "whatconverts_profile_id") {
      platformIds[field.formKey] =
        client.whatconverts_profile_id?.trim() ??
        connectionMap.get("whatconverts")?.trim() ??
        "";
    } else {
      platformIds[field.formKey] =
        connectionMap.get(field.platform)?.trim() ?? "";
    }
  }

  return {
    showInDashboard: client.show_in_dashboard ?? false,
    reportSlug: client.report_slug?.trim() ?? "",
    platformIds,
  };
}

function formatPlatformValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "Not connected";
}

export function ClientMarketingDashboardSection({
  client,
  connections,
}: ClientMarketingDashboardSectionProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const connectionMap = useMemo(
    () =>
      new Map(
        connections.map((row) => [row.platform, row.external_account_id]),
      ),
    [connections],
  );

  const initial = useMemo(
    () => buildInitialDraft(client, connectionMap),
    [client, connectionMap],
  );

  const [showInDashboard, setShowInDashboard] = useState(
    initial.showInDashboard,
  );
  const [reportSlug, setReportSlug] = useState(initial.reportSlug);
  const [platformIds, setPlatformIds] = useState<PlatformDraft>(
    initial.platformIds,
  );
  const [slugTouched, setSlugTouched] = useState(false);

  function resetDrafts() {
    setShowInDashboard(initial.showInDashboard);
    setReportSlug(initial.reportSlug);
    setPlatformIds(initial.platformIds);
    setSlugTouched(false);
  }

  useEffect(() => {
    if (!isEditing) resetDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, connections, isEditing]);

  function beginEdit() {
    resetDrafts();
    setIsEditing(true);
  }

  function cancelEdit() {
    resetDrafts();
    setIsEditing(false);
  }

  function handleReportSlugChange(value: string) {
    setSlugTouched(true);
    setReportSlug(value);
  }

  function generateSlugFromName() {
    setReportSlug(slugifyClientName(client.name ?? ""));
    setSlugTouched(true);
  }

  function setPlatformId(formKey: string, value: string) {
    setPlatformIds((prev) => ({ ...prev, [formKey]: value }));
  }

  function handleSave() {
    startTransition(async () => {
      const normalizedSlug = slugifyClientName(reportSlug.trim());
      const payload = {
        show_in_dashboard: showInDashboard,
        report_slug: normalizedSlug || null,
        platform_google: platformIds.platform_google?.trim() || null,
        platform_meta: platformIds.platform_meta?.trim() || null,
        platform_microsoft: platformIds.platform_microsoft?.trim() || null,
        platform_tiktok: platformIds.platform_tiktok?.trim() || null,
        whatconverts_profile_id:
          platformIds.whatconverts_profile_id?.trim() || null,
      };

      console.log("[dashboard] form submit report_slug:", payload.report_slug);

      const result = await updateClientMarketingDashboard(client.id, payload);
      if (result.error) {
        toastError(result.error);
        return;
      }

      toastSuccess("Marketing dashboard settings saved");
      setIsEditing(false);
      router.refresh();
    });
  }

  useEffect(() => {
    if (!isEditing || slugTouched || reportSlug.trim()) return;
    setReportSlug(slugifyClientName(client.name ?? ""));
  }, [client.name, isEditing, reportSlug, slugTouched]);

  const editButton = !isEditing ? (
    <Button type="button" variant="outline" size="sm" onClick={beginEdit}>
      Edit
    </Button>
  ) : null;

  const marketingHref = client.report_slug?.trim()
    ? `/clients/${client.id}?tab=marketing`
    : null;

  return (
    <OverviewCard title="Marketing Dashboard" headerAction={editButton}>
      {isEditing ? (
        <div className="space-y-5">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showInDashboard}
              disabled={isPending}
              onChange={(event) => setShowInDashboard(event.target.checked)}
              className="size-4 rounded border-input"
            />
            <span>Show in dashboard</span>
          </label>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="marketing-report-slug">Report slug</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={generateSlugFromName}
                className="h-7 px-2 text-xs"
              >
                Generate from name
              </Button>
            </div>
            <Input
              id="marketing-report-slug"
              value={reportSlug}
              disabled={isPending}
              placeholder="brafit-iq"
              onChange={(event) => handleReportSlugChange(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Used for marketing report URLs. Lowercase letters, numbers, and
              hyphens only.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Platform connections</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {CREATE_CLIENT_PLATFORM_FIELDS.map((field) => (
                <div key={field.formKey} className="space-y-2">
                  <Label htmlFor={field.formKey}>{field.label}</Label>
                  <Input
                    id={field.formKey}
                    value={platformIds[field.formKey] ?? ""}
                    disabled={isPending}
                    placeholder="Account ID"
                    onChange={(event) =>
                      setPlatformId(field.formKey, event.target.value)
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={handleSave}
            >
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
        <dl className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <dt className="text-muted-foreground">Show in dashboard</dt>
              <dd className="font-medium">
                {client.show_in_dashboard ? "Yes" : "No"}
              </dd>
            </div>
            {marketingHref ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                render={<Link href={marketingHref} />}
              >
                Open marketing tab
              </Button>
            ) : null}
          </div>

          <div>
            <dt className="text-muted-foreground">Report slug</dt>
            <dd className="font-medium tabular-nums">
              {client.report_slug?.trim() || "—"}
            </dd>
          </div>

          <div className="space-y-3">
            <dt className="text-muted-foreground">Platform connections</dt>
            <dd className="space-y-2">
              {CREATE_CLIENT_PLATFORM_FIELDS.map((field) => {
                const value =
                  field.formKey === "whatconverts_profile_id"
                    ? client.whatconverts_profile_id ??
                      connectionMap.get("whatconverts")
                    : connectionMap.get(field.platform);

                return (
                  <div
                    key={field.formKey}
                    className={cn(
                      "flex flex-col gap-0.5 rounded-md border border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between",
                      value?.trim() ? "bg-muted/30" : "bg-transparent",
                    )}
                  >
                    <span className="text-muted-foreground">{field.label}</span>
                    <span
                      className={cn(
                        "font-medium tabular-nums",
                        !value?.trim() && "text-muted-foreground",
                      )}
                    >
                      {formatPlatformValue(value)}
                    </span>
                  </div>
                );
              })}
            </dd>
          </div>
        </dl>
      )}
    </OverviewCard>
  );
}
