"use client";

import { TaskPriorityBadge } from "@/components/projects/task-priority-badge";
import { useTaskDrawer } from "@/components/tasks/task-drawer-provider";
import type { GroupedMyTasks, MyTaskRow } from "@/lib/queries/tasks";

const groupLabels = {
  overdue: "Overdue",
  today: "Due today",
  week: "Due this week",
  later: "Later",
} as const;

function formatDueDate(iso: string | null) {
  if (!iso) return "No due date";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function TaskRow({ task }: { task: MyTaskRow }) {
  const { openTask } = useTaskDrawer();

  return (
    <button
      type="button"
      onClick={() => openTask(task.id)}
      className="flex w-full items-start justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0">
        <p className="font-medium">{task.title}</p>
        <p className="text-sm text-muted-foreground">
          {task.project_name} · {task.client_name}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Due {formatDueDate(task.due_date)}
        </p>
      </div>
      <TaskPriorityBadge priority={task.priority} />
    </button>
  );
}

export function MyTasksList({
  groups,
  hasActiveFilters = false,
  onClearFilters,
}: {
  groups: GroupedMyTasks;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}) {
  const hasAny = Object.values(groups).some((g) => g.length > 0);

  if (!hasAny) {
    if (hasActiveFilters) {
      return (
        <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No tasks match your filters.
          </p>
          {onClearFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-3 text-sm font-medium text-primary hover:underline"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      );
    }

    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        No open tasks assigned to you.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {(Object.keys(groupLabels) as Array<keyof typeof groupLabels>).map(
        (key) =>
          groups[key].length > 0 ? (
            <section key={key}>
              <h2
                className={`mb-3 text-sm font-semibold ${
                  key === "overdue" ? "text-destructive" : "text-foreground"
                }`}
              >
                {groupLabels[key]} ({groups[key].length})
              </h2>
              <ul className="space-y-2">
                {groups[key].map((task) => (
                  <li key={task.id}>
                    <TaskRow task={task} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null,
      )}
    </div>
  );
}
