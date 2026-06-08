"use client";

import { Suspense, useMemo, useState } from "react";
import { ClientUpdateFilters } from "@/components/clients/client-update-filters";
import { ClientUpdatesTimeline } from "@/components/clients/client-updates-timeline";
import { LogUpdateSheet } from "@/components/clients/log-update-sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClientUpdateRow } from "@/lib/updates/types";
import type { TeamMember } from "@/lib/types";

type ClientUpdatesTabProps = {
  clientId: string;
  marketingChannels: string[] | null;
  updates: ClientUpdateRow[];
  teamMembers: Pick<TeamMember, "id" | "name">[];
};

export function ClientUpdatesTab({
  clientId,
  marketingChannels,
  updates,
  teamMembers,
}: ClientUpdatesTabProps) {
  const [logOpen, setLogOpen] = useState(false);

  const channelOptions = useMemo(() => {
    const values = new Set(updates.map((u) => u.marketing_channel));
    for (const channel of marketingChannels ?? []) {
      values.add(channel);
    }
    return [...values].sort();
  }, [updates, marketingChannels]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Suspense fallback={<FiltersSkeleton />}>
          <ClientUpdateFilters
            channelOptions={channelOptions}
            teamMembers={teamMembers}
          />
        </Suspense>
        <Button type="button" onClick={() => setLogOpen(true)} className="shrink-0">
          Log update
        </Button>
      </div>

      {updates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          No updates logged yet.
        </p>
      ) : (
        <ClientUpdatesTimeline updates={updates} />
      )}

      <LogUpdateSheet
        clientId={clientId}
        marketingChannels={marketingChannels}
        open={logOpen}
        onOpenChange={setLogOpen}
      />
    </div>
  );
}

function FiltersSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-8 w-44" />
    </div>
  );
}
