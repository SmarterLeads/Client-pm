"use client";

import { memo, useTransition } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MessageSquare, ListTree, Repeat, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useInternalTaskDrawer } from "@/components/internal/internal-task-drawer-provider";
import { TaskPriorityBadge } from "@/components/projects/task-priority-badge";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { deleteInternalTask } from "@/lib/actions/internal";
import type { InternalProjectTaskRow } from "@/lib/queries/internal";
import { DELETE_TASK_CONFIRM_MESSAGE } from "@/lib/tasks/constants";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDueDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export const InternalTaskCard = memo(function InternalTaskCard({
  task,
  projectId,
  isOverlay = false,
}: {
  task: InternalProjectTaskRow;
  projectId: string;
  isOverlay?: boolean;
}) {
  const router = useRouter();
  const { openTask, closeTask, taskId: openTaskId } = useInternalTaskDrawer();
  const [isDeleting, startDeleteTransition] = useTransition();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: {
        type: "task",
        taskId: task.id,
        sectionId: task.section_id,
      },
      disabled: isOverlay,
    });

  const style =
    !isOverlay && transform
      ? { transform: CSS.Translate.toString(transform) }
      : undefined;

  function handleDelete(event: React.MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    if (!window.confirm(DELETE_TASK_CONFIRM_MESSAGE)) return;

    startDeleteTransition(async () => {
      const result = await deleteInternalTask(task.id, projectId);
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Task deleted");
      if (openTaskId === task.id) {
        closeTask();
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      className={cn(
        "group/card relative rounded-lg border border-border bg-card shadow-sm",
        isDragging && !isOverlay && "opacity-40 ring-2 ring-primary",
        isDeleting && "pointer-events-none opacity-50",
      )}
    >
      {!isOverlay ? (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label="Delete task"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover/card:opacity-100",
          )}
        >
          <Trash2 className="size-3.5 text-destructive" />
        </button>
      ) : null}
      <div className="flex items-start gap-1 p-3">
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          aria-label="Drag task"
          disabled={isOverlay}
          {...(isOverlay ? {} : listeners)}
          {...(isOverlay ? {} : attributes)}
        >
          <GripVertical className="size-4" />
        </button>
        <button
          type="button"
          className="min-w-0 flex-1 pr-6 text-left"
          onClick={() => openTask(task.id)}
        >
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          <div className="mt-2 flex items-center gap-2">
            <TaskPriorityBadge priority={task.priority} />
            {task.is_recurring ? (
              <Repeat
                className="size-3.5 text-muted-foreground"
                aria-label="Recurring task"
              />
            ) : null}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {task.assignee_name ? (
                <Avatar size="sm">
                  {task.assignee_avatar_url ? (
                    <AvatarImage src={task.assignee_avatar_url} alt="" />
                  ) : null}
                  <AvatarFallback>{initials(task.assignee_name)}</AvatarFallback>
                </Avatar>
              ) : (
                <span>Unassigned</span>
              )}
              {task.due_date ? (
                <span>{formatDueDate(task.due_date)}</span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {task.subtask_count > 0 ? (
                <span className="flex items-center gap-0.5">
                  <ListTree className="size-3" aria-hidden />
                  {task.subtask_count}
                </span>
              ) : null}
              {task.comment_count > 0 ? (
                <span className="flex items-center gap-0.5">
                  <MessageSquare className="size-3" aria-hidden />
                  {task.comment_count}
                </span>
              ) : null}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
});
