"use client";

import { CheckCircle2Icon } from "lucide-react";
import { TaskPriorityBadge } from "@/components/projects/task-priority-badge";
import { useTaskDrawer } from "@/components/tasks/task-drawer-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  DashboardMyTaskRow,
  DashboardMyTasks,
} from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

function DashboardMyTaskItem({ task }: { task: DashboardMyTaskRow }) {
  const { openTask } = useTaskDrawer();

  return (
    <button
      type="button"
      onClick={() => openTask(task.id)}
      className="flex w-full items-start justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0">
        <p className="font-medium">{task.title}</p>
        <p className="text-sm text-muted-foreground">{task.project_name}</p>
      </div>
      <TaskPriorityBadge priority={task.priority} />
    </button>
  );
}

function TaskGroup({
  title,
  titleClassName,
  tasks,
}: {
  title: string;
  titleClassName?: string;
  tasks: DashboardMyTaskRow[];
}) {
  if (tasks.length === 0) return null;

  return (
    <section>
      <h3 className={cn("mb-2 text-sm font-semibold", titleClassName)}>
        {title} ({tasks.length})
      </h3>
      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id}>
            <DashboardMyTaskItem task={task} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DashboardMyTasksWidget({ tasks }: { tasks: DashboardMyTasks }) {
  const hasTasks = tasks.overdue.length > 0 || tasks.today.length > 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>My tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasTasks ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-4 py-12 text-center">
            <CheckCircle2Icon
              className="size-10 text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
            <p className="text-sm text-muted-foreground">
              No urgent tasks — you&apos;re all caught up!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <TaskGroup
              title="Overdue"
              titleClassName="text-destructive"
              tasks={tasks.overdue}
            />
            <TaskGroup
              title="Due today"
              titleClassName="text-amber-600 dark:text-amber-400"
              tasks={tasks.today}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
