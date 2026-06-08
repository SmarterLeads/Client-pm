"use client";

import { useState } from "react";
import { ChevronDown, Repeat } from "lucide-react";
import { TaskPriorityDot } from "@/components/projects/task-priority-badge";
import { useTaskDrawer } from "@/components/tasks/task-drawer-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type {
  GroupedMyTasks,
  MyTaskGroup,
  MyTaskRow,
} from "@/lib/queries/tasks";
import { cn } from "@/lib/utils";

const groupLabels: Record<MyTaskGroup, string> = {
  overdue: "Overdue",
  today: "Due today",
  week: "Due this week",
  later: "Later",
};

const groupOrder: MyTaskGroup[] = ["overdue", "today", "week", "later"];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDueDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function dueDateClassName(dueDate: string | null, today: string) {
  if (!dueDate) return "text-muted-foreground";
  if (dueDate < today) return "text-destructive";
  if (dueDate === today) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

function TaskRow({
  task,
  assignee,
  today,
}: {
  task: MyTaskRow;
  assignee: { name: string; avatar_url: string | null };
  today: string;
}) {
  const { openTask } = useTaskDrawer();

  return (
    <button
      type="button"
      onClick={() => openTask(task.id)}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
    >
      <TaskPriorityDot priority={task.priority} />

      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
        <span className="truncate font-medium">{task.title}</span>
        <span className="shrink-0 text-muted-foreground" aria-hidden>
          ·
        </span>
        <span className="truncate text-sm text-muted-foreground">
          {task.project_name}
        </span>
        <span className="shrink-0 text-muted-foreground" aria-hidden>
          ·
        </span>
        <span className="truncate text-sm text-muted-foreground">
          {task.client_name}
        </span>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        {task.is_recurring ? (
          <Repeat
            className="size-3.5 text-muted-foreground"
            aria-label="Recurring task"
          />
        ) : null}
        {task.due_date ? (
          <span
            className={cn(
              "text-sm tabular-nums",
              dueDateClassName(task.due_date, today),
            )}
          >
            {formatDueDate(task.due_date)}
          </span>
        ) : null}
        <Avatar size="sm">
          {assignee.avatar_url ? (
            <AvatarImage src={assignee.avatar_url} alt="" />
          ) : null}
          <AvatarFallback>{initials(assignee.name)}</AvatarFallback>
        </Avatar>
      </div>
    </button>
  );
}

function TaskGroupSection({
  groupKey,
  tasks,
  assignee,
  today,
}: {
  groupKey: MyTaskGroup;
  tasks: MyTaskRow[];
  assignee: { name: string; avatar_url: string | null };
  today: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (tasks.length === 0) return null;

  const headerClassName =
    groupKey === "overdue"
      ? "text-destructive"
      : groupKey === "today"
        ? "text-amber-600 dark:text-amber-400"
        : "text-foreground";

  return (
    <section>
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="mb-2 flex w-full items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-muted/40"
        aria-expanded={!collapsed}
      >
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            collapsed && "-rotate-90",
          )}
          aria-hidden
        />
        <h2 className={cn("text-sm font-semibold", headerClassName)}>
          {groupLabels[groupKey]}
        </h2>
        <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
          {tasks.length}
        </Badge>
      </button>

      {!collapsed ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <ul className="divide-y divide-border">
            {tasks.map((task) => (
              <li key={task.id}>
                <TaskRow task={task} assignee={assignee} today={today} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export function MyTasksList({
  groups,
  hasActiveFilters = false,
  assignee,
  onClearFilters,
}: {
  groups: GroupedMyTasks;
  hasActiveFilters?: boolean;
  assignee: { name: string; avatar_url: string | null };
  onClearFilters?: () => void;
}) {
  const today = todayIso();
  const hasAny = Object.values(groups).some((group) => group.length > 0);

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
    <div className="space-y-6">
      {groupOrder.map((key) =>
        groups[key].length > 0 ? (
          <TaskGroupSection
            key={key}
            groupKey={key}
            tasks={groups[key]}
            assignee={assignee}
            today={today}
          />
        ) : null,
      )}
    </div>
  );
}
