import { Suspense } from "react";
import { MyTasksFilters } from "@/components/tasks/my-tasks-filters";
import { MyTasksListShell } from "@/components/tasks/my-tasks-list-shell";
import { MyTasksNewTaskButton } from "@/components/tasks/my-tasks-new-task-button";
import { Skeleton } from "@/components/ui/skeleton";
import { getTeamMember } from "@/lib/auth/session";
import {
  getMyTaskClientOptions,
  groupMyTasks,
  getMyTasks,
} from "@/lib/queries/tasks";
import { myTasksFiltersSchema } from "@/lib/validations/task";
import { redirect } from "next/navigation";

type TasksPageProps = {
  searchParams: Promise<{
    q?: string;
    client?: string;
    due?: string;
  }>;
};

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const teamMember = await getTeamMember();
  if (!teamMember) {
    redirect("/login");
  }

  const params = await searchParams;
  const parsed = myTasksFiltersSchema.safeParse({
    q: params.q,
    client: params.client,
    due: params.due || "all",
  });

  const filters = parsed.success
    ? {
        search: parsed.data.q,
        clientId: parsed.data.client,
        dueDateFilter: parsed.data.due ?? "all",
      }
    : { dueDateFilter: "all" as const };

  const hasActiveFilters = Boolean(
    filters.search?.trim() ||
      filters.clientId ||
      (filters.dueDateFilter && filters.dueDateFilter !== "all"),
  );

  const [tasks, clients] = await Promise.all([
    getMyTasks(teamMember.id, filters),
    getMyTaskClientOptions(teamMember.id),
  ]);

  const groups = groupMyTasks(tasks);
  const total = tasks.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {total} task{total === 1 ? "" : "s"}
          </p>
        </div>
        <MyTasksNewTaskButton assigneeId={teamMember.id} />
      </div>

      <Suspense fallback={<FiltersSkeleton />}>
        <MyTasksFilters clients={clients} />
      </Suspense>

      <MyTasksListShell
        groups={groups}
        hasActiveFilters={hasActiveFilters}
        assignee={{
          name: teamMember.name,
          avatar_url: teamMember.avatar_url,
        }}
      />
    </div>
  );
}

function FiltersSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Skeleton className="h-8 w-full sm:max-w-xs" />
      <Skeleton className="h-8 w-52" />
      <Skeleton className="h-8 w-44" />
    </div>
  );
}
