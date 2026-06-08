import Link from "next/link";
import { Suspense } from "react";
import { ProjectsFilters } from "@/components/projects/projects-filters";
import { ProjectsTable } from "@/components/projects/projects-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getProjectFilterOptions,
  getProjectsList,
} from "@/lib/queries/projects";
import { projectListFiltersSchema } from "@/lib/validations/project";

type ProjectsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    client?: string;
    owner?: string;
  }>;
};

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const parsed = projectListFiltersSchema.safeParse({
    q: params.q,
    status: params.status || undefined,
    client: params.client || undefined,
    owner: params.owner || undefined,
  });

  const filters = parsed.success ? parsed.data : {};
  const [projects, filterOptions] = await Promise.all([
    getProjectsList(filters),
    getProjectFilterOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} project{projects.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button render={<Link href="/projects/new" />}>New project</Button>
      </div>

      <Suspense fallback={<FiltersSkeleton />}>
        <ProjectsFilters
          clients={filterOptions.clients}
          owners={filterOptions.owners}
        />
      </Suspense>

      <ProjectsTable projects={projects} />
    </div>
  );
}

function FiltersSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Skeleton className="h-8 w-full sm:max-w-xs" />
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-8 w-44" />
    </div>
  );
}
