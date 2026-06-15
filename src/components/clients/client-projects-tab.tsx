"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ProjectStatusBadge } from "@/components/clients/project-status-badge";
import { RagDot } from "@/components/clients/rag-dot";
import { TaskProgressBar } from "@/components/clients/task-progress-bar";
import { TaskPriorityDot } from "@/components/projects/task-priority-badge";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { useTaskDrawer } from "@/components/tasks/task-drawer-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <p className="px-4 py-3 text-sm text-muted-foreground">No open tasks</p>
    );
  }

  const sections = groupTasksBySection(tasks);

  return (
    <div className="border-t border-border bg-muted/20">
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

export function ClientProjectsTab({
  clientId,
  projects,
  openTasksByProject,
}: {
  clientId: string;
  projects: ClientProjectRow[];
  openTasksByProject: Record<string, ClientProjectOpenTaskRow[]>;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

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
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>RAG</TableHead>
                <TableHead className="hidden md:table-cell">Owner</TableHead>
                <TableHead className="hidden sm:table-cell">Due date</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Expand</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => {
                const openCount = openCounts[project.id] ?? 0;
                const expanded = expandedIds.has(project.id);
                const openTasks = openTasksByProject[project.id] ?? [];

                return (
                  <Fragment key={project.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => toggleExpanded(project.id)}
                    >
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <Link
                            href={`/projects/${project.id}`}
                            className="font-medium hover:underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {project.name}
                          </Link>
                          {openCount > 0 ? (
                            <span className="text-xs text-muted-foreground">
                              ({openCount} open)
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ProjectStatusBadge status={project.status} />
                      </TableCell>
                      <TableCell>
                        <RagDot status={project.rag_status} />
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {project.owner_name ?? "—"}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {formatDate(project.due_date)}
                      </TableCell>
                      <TableCell>
                        <TaskProgressBar
                          done={project.done_tasks}
                          total={project.total_tasks}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <ChevronDown
                          className={cn(
                            "size-4 transition-transform",
                            expanded && "rotate-180",
                          )}
                          aria-hidden
                        />
                      </TableCell>
                    </TableRow>
                    {expanded ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={7} className="p-0">
                          <ProjectOpenTasksPanel tasks={openTasks} />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
