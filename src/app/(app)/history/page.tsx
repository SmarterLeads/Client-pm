import { redirect } from "next/navigation";
import { Suspense } from "react";
import { HistoryFilters } from "@/components/history/history-filters";
import {
  HistoryPageSummary,
  HistoryPagination,
} from "@/components/history/history-pagination";
import { ChangeHistoryTimeline } from "@/components/shared/change-history-timeline";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_CHANGE_HISTORY_PAGE_SIZE } from "@/lib/change-history/types";
import { getTeamMember } from "@/lib/auth/session";
import {
  getChangeHistory,
  getChangeHistoryEntityTypes,
} from "@/lib/queries/change-history";
import { getActiveTeamMembers } from "@/lib/queries/clients";

type HistoryPageProps = {
  searchParams: Promise<{
    entity_type?: string;
    changed_by?: string;
    page?: string;
  }>;
};

function parseHistoryPage(pageParam: string | undefined) {
  const parsed = Number.parseInt(pageParam ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

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
  const pageParam = parseHistoryPage(params.page);
  const page = pageParam - 1;

  const [historyPage, entityTypes, teamMembers] = await Promise.all([
    getChangeHistory(filters, page, DEFAULT_CHANGE_HISTORY_PAGE_SIZE),
    getChangeHistoryEntityTypes(),
    getActiveTeamMembers(),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Change history
        </h1>
        <HistoryPageSummary
          page={pageParam}
          totalCount={historyPage.totalCount}
        />
        <p className="text-sm text-muted-foreground">Admin only</p>
      </div>

      <Suspense fallback={<FiltersSkeleton />}>
        <HistoryFilters
          entityTypes={entityTypes}
          teamMembers={teamMembers.map((m) => ({ id: m.id, name: m.name }))}
        />
      </Suspense>

      <ChangeHistoryTimeline entries={historyPage.entries} showEntity />

      <HistoryPagination
        page={pageParam}
        totalCount={historyPage.totalCount}
        searchParams={filters}
      />
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
