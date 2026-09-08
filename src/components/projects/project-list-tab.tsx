"use client";

import { Repeat } from "lucide-react";
import { TaskPriorityBadge } from "@/components/projects/task-priority-badge";
import { QuickAddTaskForm } from "@/components/tasks/quick-add-task-form";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { useTaskDrawer } from "@/components/tasks/task-drawer-provider";
import type { ProjectTaskRow } from "@/lib/queries/projects";
import type { ProjectSection, TeamMember } from "@/lib/types";

type ProjectListTabProps = {
  projectId: string;
  sections: ProjectSection[];
  tasks: ProjectTaskRow[];
  teamMembers: Pick<TeamMember, "id" | "name">[];
  currentTeamMemberId: string;
};

function formatDueDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ProjectListTab({
  projectId,
  sections,
  tasks,
  teamMembers,
  currentTeamMemberId,
}: ProjectListTabProps) {
  const { openTask } = useTaskDrawer();

  if (sections.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        No board sections configured for this project.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const sectionTasks = tasks
          .filter((t) => t.section_id === section.id)
          .sort((a, b) => {
            if (a.due_date && b.due_date) {
              return a.due_date.localeCompare(b.due_date);
            }
            if (a.due_date) return -1;
            if (b.due_date) return 1;
            return 0;
          });

        return (
          <section key={section.id}>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              {section.name}
              <span className="ml-2 text-xs">({sectionTasks.length})</span>
            </h3>
            {sectionTasks.length > 0 ? (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {sectionTasks.map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => openTask(task.id)}
                      className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-muted/50"
                    >
                      <span className="flex min-w-0 items-center gap-2 font-medium">
                        <TaskStatusBadge status={task.status} />
                        <span className="truncate">{task.title}</span>
                        {task.is_recurring || task.is_recurring_instance ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            <Repeat className="size-3" aria-hidden />
                            Recurring
                          </span>
                        ) : null}
                      </span>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <TaskPriorityBadge priority={task.priority} />
                        <span>{task.assignee_name ?? "Unassigned"}</span>
                        <span>{formatDueDate(task.due_date)}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-2 rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                No tasks in this section.
              </p>
            )}
            <div className="mt-2">
              <QuickAddTaskForm
                projectId={projectId}
                sectionId={section.id}
                sections={sections}
                teamMembers={teamMembers}
                currentTeamMemberId={currentTeamMemberId}
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}
