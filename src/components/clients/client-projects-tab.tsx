"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ProjectStatusBadge } from "@/components/clients/project-status-badge";
import { RagDot } from "@/components/clients/rag-dot";
import { TaskProgressBar } from "@/components/clients/task-progress-bar";
import { TaskPriorityDot } from "@/components/projects/task-priority-badge";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { useTaskDrawer } from "@/components/tasks/task-drawer-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type {
  ClientProjectOpenTaskRow,
  ClientProjectRow,
} from "@/lib/queries/clients";
import type { TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTaskDueDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const SECTION_GROUP_ORDER: Record<string, number> = {
  todo: 0,
  in_progress: 1,
  in_review: 2,
};

const SECTION_GROUP_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
};

function sectionGroupKey(
  sectionName: string | null,
  status: TaskStatus,
): string {
  const name = sectionName?.trim().toLowerCase() ?? "";
  if (/to\s*do/.test(name) || name === "todo") return "todo";
  if (/in\s*progress/.test(name)) return "in_progress";
  if (/in\s*review/.test(name)) return "in_review";
  if (sectionName?.trim()) return `custom:${sectionName.trim()}`;
  if (status === "in_progress") return "in_progress";
  if (status === "in_review") return "in_review";
  return "todo";
}

function sectionGroupLabel(key: string): string {
  if (key.startsWith("custom:")) return key.slice("custom:".length);
  return SECTION_GROUP_LABELS[key] ?? key;
}

function sectionGroupSortKey(key: string): string {
  if (key.startsWith("custom:")) return `z:${key.slice("custom:".length).toLowerCase()}`;
  const order = SECTION_GROUP_ORDER[key];
  return order !== undefined ? String(order).padStart(3, "0") : `y:${key}`;
}

function groupTasksBySection(tasks: ClientProjectOpenTaskRow[]) {
  const groups = new Map<string, ClientProjectOpenTaskRow[]>();

  for (const task of tasks) {
    const key = sectionGroupKey(task.section_name, task.status);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(task);
  }

  return [...groups.entries()].sort(([a], [b]) =>
    sectionGroupSortKey(a).localeCompare(sectionGroupSortKey(b)),
  );
}

function OpenTaskRow({ task }: { task: ClientProjectOpenTaskRow }) {
  const { openTask } = useTaskDrawer();
  const today = todayIso();
  const isOverdue = Boolean(task.due_date && task.due_date < today);

  return (
    <button
      type="button"
      onClick={() => openTask(task.id)}
      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-muted/50"
    >
      <TaskPriorityDot priority={task.priority} />
      <span className="min-w-0 flex-1 truncate font-medium">{task.title}</span>
      <TaskStatusBadge status={task.status} />
      {task.assignee_name ? (
        <Avatar size="sm">
          {task.assignee_avatar_url ? (
            <AvatarImage src={task.assignee_avatar_url} alt="" />
          ) : null}
          <AvatarFallback>{initials(task.assignee_name)}</AvatarFallback>
        </Avatar>
      ) : (
        <span className="size-6 shrink-0" aria-hidden />
      )}
      <span
        className={cn(
          "w-16 shrink-0 text-right text-xs tabular-nums",
          isOverdue ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {task.due_date ? formatTaskDueDate(task.due_date) : "—"}
      </span>
    </button>
  );
}

function ProjectOpenTasksPanel({
  tasks,
}: {
  tasks: ClientProjectOpenTaskRow[];
}) {
  if (tasks.length === 0) {
    return (
      <p className="border-t border-gray-200 px-4 py-2 text-sm text-muted-foreground">
        No open tasks
      </p>
    );
  }

  const sections = groupTasksBySection(tasks);

  return (
    <div className="border-t border-gray-200 bg-muted/20">
      {sections.map(([sectionKey, sectionTasks]) => (
        <div key={sectionKey}>
          <p className="px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {sectionGroupLabel(sectionKey)}
          </p>
          <div className="divide-y divide-border/60">
            {sectionTasks.map((task) => (
              <OpenTaskRow key={task.id} task={task} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjectCard({
  project,
  openCount,
  expanded,
  openTasks,
  onToggle,
}: {
  project: ClientProjectRow;
  openCount: number;
  expanded: boolean;
  openTasks: ClientProjectOpenTaskRow[];
  onToggle: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div
        className="flex cursor-pointer items-center gap-4 p-4 sm:gap-6"
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
      >
        <div className="flex min-w-0 items-baseline gap-2 sm:max-w-[14rem]">
          <Link
            href={`/projects/${project.id}`}
            className="truncate text-base font-semibold hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {project.name}
          </Link>
          {openCount > 0 ? (
            <span className="shrink-0 text-xs text-muted-foreground">
              ({openCount} open)
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-4 sm:gap-6">
          <ProjectStatusBadge status={project.status} />
          <RagDot status={project.rag_status} />
          <span className="hidden shrink-0 text-sm text-muted-foreground md:inline">
            {project.owner_name ?? "—"}
          </span>
          <span className="hidden shrink-0 text-sm text-muted-foreground sm:inline">
            {formatDate(project.due_date)}
          </span>
          <div className="w-24 shrink-0">
            <TaskProgressBar
              done={project.done_tasks}
              total={project.total_tasks}
            />
          </div>
        </div>

        <div className="ml-auto shrink-0 text-muted-foreground">
          {expanded ? (
            <ChevronUp className="size-4" aria-hidden />
          ) : (
            <ChevronDown className="size-4" aria-hidden />
          )}
        </div>
      </div>

      {expanded ? <ProjectOpenTasksPanel tasks={openTasks} /> : null}
    </article>
  );
}

export function ClientProjectsTab({
  clientId,
  projects,
  openTasksByProject,
}: {
  clientId: string;
  projects: ClientProjectRow[];
  openTasksByProject: Record<string, ClientProjectOpenTaskRow[]>;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(projects.map((project) => project.id)),
  );

  const openCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [projectId, tasks] of Object.entries(openTasksByProject)) {
      counts[projectId] = tasks.length;
    }
    return counts;
  }, [openTasksByProject]);

  function toggleExpanded(projectId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button render={<Link href={`/projects/new?clientId=${clientId}`} />}>
          New project
        </Button>
      </div>

      {projects.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          No projects for this client yet.
        </p>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const openCount = openCounts[project.id] ?? 0;
            const expanded = expandedIds.has(project.id);
            const openTasks = openTasksByProject[project.id] ?? [];

            return (
              <ProjectCard
                key={project.id}
                project={project}
                openCount={openCount}
                expanded={expanded}
                openTasks={openTasks}
                onToggle={() => toggleExpanded(project.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
