"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { TaskPriorityBadge } from "@/components/projects/task-priority-badge";
import { useTaskDrawer } from "@/components/tasks/task-drawer-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { reassignTasks } from "@/lib/actions/team";
import { toastError, toastSuccess } from "@/lib/toast";
import type {
  MemberTasksByProject,
  TeamWorkloadMember,
} from "@/lib/team/types";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";

type TeamMemberDrawerProps = {
  member: TeamWorkloadMember | null;
  tasksByProject: MemberTasksByProject[];
  reassignTargets: { id: string; name: string }[];
  reassignMode: boolean;
  canManage: boolean;
  onClose: () => void;
  onReassignComplete: () => void;
};

function formatDueDate(iso: string | null) {
  if (!iso) return "No due date";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TeamMemberDrawer({
  member,
  tasksByProject,
  reassignTargets,
  reassignMode,
  canManage,
  onClose,
  onReassignComplete,
}: TeamMemberDrawerProps) {
  const { openTask } = useTaskDrawer();
  const [mounted, setMounted] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isOpen = member !== null;
  const showReassign = reassignMode && canManage;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedTaskIds(new Set());
      setNewAssigneeId("");
      setError(null);
    }
  }, [isOpen, member?.id]);

  function toggleTask(taskId: string) {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }

  function handleReassign() {
    if (selectedTaskIds.size === 0) {
      setError("Select at least one task.");
      return;
    }
    if (!newAssigneeId) {
      setError("Choose a team member to reassign to.");
      return;
    }

    startTransition(async () => {
      const result = await reassignTasks([...selectedTaskIds], newAssigneeId);
      if (result.error) {
        setError(result.error);
        toastError(result.error);
        return;
      }
      setError(null);
      toastSuccess("Tasks reassigned");
      onReassignComplete();
      onClose();
    });
  }

  if (!isOpen || !mounted || !member) {
    return null;
  }

  const otherMembers = reassignTargets.filter((m) => m.id !== member.id);
  const totalTasks = tasksByProject.reduce((sum, g) => sum + g.tasks.length, 0);

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${member.name} tasks`}
        className="absolute top-0 right-0 flex h-full w-full max-w-[560px] flex-col overflow-hidden bg-popover text-popover-foreground shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold">{member.name}</h2>
            <p className="text-sm text-muted-foreground">
              {totalTasks} open task{totalTasks === 1 ? "" : "s"}
              {showReassign ? " · Reassign mode" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {totalTasks === 0 ? (
            <p className="text-sm text-muted-foreground">No open tasks assigned.</p>
          ) : (
            <div className="space-y-6">
              {tasksByProject.map((group) => (
                <section key={group.project_id}>
                  <h3 className="mb-2 text-sm font-medium">{group.project_name}</h3>
                  <ul className="space-y-2">
                    {group.tasks.map((task) => (
                      <li
                        key={task.id}
                        className={cn(
                          "rounded-lg border border-border bg-card p-3",
                          showReassign && "flex items-start gap-3",
                        )}
                      >
                        {showReassign ? (
                          <input
                            type="checkbox"
                            checked={selectedTaskIds.has(task.id)}
                            onChange={() => toggleTask(task.id)}
                            className="mt-1 size-4 shrink-0 rounded border-input"
                            aria-label={`Select ${task.title}`}
                          />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            if (!showReassign) openTask(task.id);
                          }}
                          className={cn(
                            "min-w-0 flex-1 text-left",
                            showReassign && "cursor-default",
                          )}
                        >
                          <p className="text-sm font-medium">{task.title}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <TaskPriorityBadge priority={task.priority} />
                            <span className="text-xs text-muted-foreground">
                              {formatDueDate(task.due_date)}
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        {showReassign ? (
          <div className="shrink-0 space-y-3 border-t border-border p-4">
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <div>
              <Label htmlFor="reassign_to">Reassign to</Label>
              <select
                id="reassign_to"
                value={newAssigneeId}
                onChange={(e) => setNewAssigneeId(e.target.value)}
                className="mt-1.5 h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
              >
                <option value="">Select team member…</option>
                {otherMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              disabled={isPending || selectedTaskIds.size === 0 || !newAssigneeId}
              onClick={handleReassign}
            >
              {isPending
                ? "Reassigning…"
                : `Reassign ${selectedTaskIds.size} task${selectedTaskIds.size === 1 ? "" : "s"}`}
            </Button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
