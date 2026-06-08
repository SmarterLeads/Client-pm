import Link from "next/link";
import { Suspense } from "react";
import { InternalProjectsFilters } from "@/components/internal/internal-projects-filters";
import { InternalProjectsTable } from "@/components/internal/internal-projects-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getInternalProjectFilterOptions,
  getInternalProjects,
} from "@/lib/queries/internal";
import { internalProjectListFiltersSchema } from "@/lib/validations/internal";

type InternalProjectsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    owner?: string;
  }>;
};

export default async function InternalProjectsPage({
  searchParams,
}: InternalProjectsPageProps) {
  const params = await searchParams;
  const parsed = internalProjectListFiltersSchema.safeParse({
    q: params.q,
    status: params.status || undefined,
    owner: params.owner || undefined,
  });

  const filters = parsed.success ? parsed.data : {};
  const [projects, filterOptions] = await Promise.all([
    getInternalProjects(filters),
    getInternalProjectFilterOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Internal projects
          </h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} project{projects.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button render={<Link href="/internal/projects/new" />}>
          New project
        </Button>
      </div>

      <Suspense fallback={<FiltersSkeleton />}>
        <InternalProjectsFilters owners={filterOptions.owners} />
      </Suspense>

      <InternalProjectsTable projects={projects} />
    </div>
  );
}

function FiltersSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Skeleton className="h-8 w-full sm:max-w-xs" />
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-8 w-44" />
    </div>
  );
}
