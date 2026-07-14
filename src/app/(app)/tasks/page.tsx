import { Suspense } from "react";
import { MyTasksFilters } from "@/components/tasks/my-tasks-filters";
import { MyTasksListShell } from "@/components/tasks/my-tasks-list-shell";
import { MyTasksNewTaskButton } from "@/components/tasks/my-tasks-new-task-button";
import { Skeleton } from "@/components/ui/skeleton";
import { canReviewTasks, getTeamMember } from "@/lib/auth/session";
import {
  getMyTaskClientOptions,
  groupMyTasks,
  getMyTasks,
  getTasksToReview,
} from "@/lib/queries/tasks";
import { TasksToReviewSection } from "@/components/tasks/tasks-to-review-section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { myTasksFiltersSchema } from "@/lib/validations/task";
import { redirect } from "next/navigation";

type TasksPageProps = {
  searchParams: Promise<{
    q?: string;
    client?: string;
    due?: string;
    show_completed?: string;
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
    show_completed: params.show_completed,
  });

  const showCompleted = parsed.success && parsed.data.show_completed === "true";

  const filters = parsed.success
    ? {
        search: parsed.data.q,
        clientId: parsed.data.client,
        dueDateFilter: parsed.data.due ?? "all",
        showCompleted,
      }
    : { dueDateFilter: "all" as const, showCompleted: false };

  const hasActiveFilters = Boolean(
    filters.search?.trim() ||
      filters.clientId ||
      (filters.dueDateFilter && filters.dueDateFilter !== "all"),
  );

  const showReviewQueue = canReviewTasks(teamMember);

  const [taskResult, clients, tasksToReview] = await Promise.all([
    getMyTasks(teamMember.id, filters),
    getMyTaskClientOptions(teamMember.id),
    showReviewQueue ? getTasksToReview() : Promise.resolve([]),
  ]);

  const groups = groupMyTasks(taskResult.active);
  const total = taskResult.active.length;

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
        <MyTasksFilters
          clients={clients}
          completedCount={taskResult.completedCount}
        />
      </Suspense>

      <MyTasksListShell
        groups={groups}
        completedTasks={taskResult.completed}
        completedCount={taskResult.completedCount}
        showCompleted={showCompleted}
        hasActiveFilters={hasActiveFilters}
        assignee={{
          name: teamMember.name,
          avatar_url: teamMember.avatar_url,
        }}
      />

      {showReviewQueue ? (
        <Card>
          <CardHeader>
            <CardTitle>Tasks to Review</CardTitle>
          </CardHeader>
          <CardContent>
            <TasksToReviewSection tasks={tasksToReview} />
          </CardContent>
        </Card>
      ) : null}
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
