"use client";

import { Repeat } from "lucide-react";
import { InternalQuickAddTaskForm } from "@/components/internal/internal-quick-add-task-form";
import { useInternalTaskDrawer } from "@/components/internal/internal-task-drawer-provider";
import { TaskPriorityBadge } from "@/components/projects/task-priority-badge";
import type { InternalProjectTaskRow } from "@/lib/queries/internal";
import type { InternalProjectSection } from "@/lib/types/internal";
import type { TeamMember } from "@/lib/types";

type InternalProjectListTabProps = {
  projectId: string;
  sections: InternalProjectSection[];
  tasks: InternalProjectTaskRow[];
  teamMembers: Pick<TeamMember, "id" | "name">[];
};

function formatDueDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function InternalProjectListTab({
  projectId,
  sections,
  tasks,
  teamMembers,
}: InternalProjectListTabProps) {
  const { openTask } = useInternalTaskDrawer();

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
        const sectionTasks = tasks.filter((t) => t.section_id === section.id);

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
                      className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/50"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        {task.title}
                        {task.is_recurring ? (
                          <Repeat
                            className="size-3.5 shrink-0 text-muted-foreground"
                            aria-label="Recurring task"
                          />
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
              <InternalQuickAddTaskForm
                projectId={projectId}
                sectionId={section.id}
                teamMembers={teamMembers}
                onCreated={openTask}
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}
