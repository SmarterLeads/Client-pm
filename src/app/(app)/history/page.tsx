import { redirect } from "next/navigation";
import { Suspense } from "react";
import { HistoryFilters } from "@/components/history/history-filters";
import { ChangeHistoryTimeline } from "@/components/shared/change-history-timeline";
import { Skeleton } from "@/components/ui/skeleton";
import { getTeamMember } from "@/lib/auth/session";
import {
  getChangeHistoryEntityTypes,
  getGlobalChangeHistory,
} from "@/lib/queries/change-history";
import { getActiveTeamMembers } from "@/lib/queries/clients";

type HistoryPageProps = {
  searchParams: Promise<{
    entity_type?: string;
    changed_by?: string;
  }>;
};

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const teamMember = await getTeamMember();
  if (!teamMember || teamMember.role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const filters = {
    entity_type: params.entity_type || undefined,
    changed_by: params.changed_by || undefined,
  };

  const [entries, entityTypes, teamMembers] = await Promise.all([
    getGlobalChangeHistory(filters),
    getChangeHistoryEntityTypes(),
    getActiveTeamMembers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Change history
        </h1>
        <p className="text-sm text-muted-foreground">
          Last {entries.length} changes across all entities (admin only)
        </p>
      </div>

      <Suspense fallback={<FiltersSkeleton />}>
        <HistoryFilters
          entityTypes={entityTypes}
          teamMembers={teamMembers.map((m) => ({ id: m.id, name: m.name }))}
        />
      </Suspense>

      <ChangeHistoryTimeline entries={entries} showEntity />
    </div>
  );
}

function FiltersSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-8 w-48" />
    </div>
  );
}
