import { Suspense } from "react";
import { ClientActivityFilters } from "@/components/clients/client-activity-filters";
import { ClientActivityTimelineShell } from "@/components/clients/client-activity-timeline-shell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getActiveTeamMembers,
  getClientActivityLog,
  type ClientActivityLogFilters,
} from "@/lib/queries/clients";

type ClientHistoryPanelProps = {
  clientId: string;
  filters?: ClientActivityLogFilters;
  hasActiveFilters?: boolean;
};

export async function ClientHistoryPanel({
  clientId,
  filters = {},
  hasActiveFilters = false,
}: ClientHistoryPanelProps) {
  const [activityLog, teamMembers] = await Promise.all([
    getClientActivityLog(clientId, filters),
    getActiveTeamMembers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Activity</h2>
        <p className="text-sm text-muted-foreground">
          {activityLog.totalCount} event
          {activityLog.totalCount === 1 ? "" : "s"} for this client
        </p>
      </div>

      <Suspense fallback={<FiltersSkeleton />}>
        <ClientActivityFilters
          teamMembers={teamMembers.map((member: { id: string; name: string }) => ({
            id: member.id,
            name: member.name,
          }))}
        />
      </Suspense>

      <ClientActivityTimelineShell
        key={JSON.stringify(filters)}
        clientId={clientId}
        initialEvents={activityLog.entries}
        initialHasMore={activityLog.hasMore}
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        clientPath={`/clients/${clientId}`}
      />
    </div>
  );
}

function FiltersSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-48" />
      </div>
    </div>
  );
}
