"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { TaskPriorityBadge } from "@/components/projects/task-priority-badge";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import {
  deleteInternalTask,
  loadInternalTaskDetail,
  updateInternalTask,
} from "@/lib/actions/internal";
import type { InternalTaskDetail } from "@/lib/queries/internal";
import { toastError, toastSuccess } from "@/lib/toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  sheetFieldLabelClassName,
  sheetSelectClassName,
} from "@/components/ui/sheet-form";
import type { TeamMember } from "@/lib/types";
import { normalizeRichTextHtml } from "@/lib/rich-text";
import { closeInternalTaskDrawer } from "@/lib/stores/internal-task-drawer-store";
import { cn } from "@/lib/utils";
import { DELETE_TASK_CONFIRM_MESSAGE } from "@/lib/tasks/constants";
import { getTaskStatusSelectOptions } from "@/lib/tasks/status-options";
import { PmEnumValues } from "@/lib/types/enums";
import { XIcon } from "lucide-react";

const priorities = PmEnumValues.task_priority;

type InternalTaskDrawerProps = {
  taskId: string | null;
  teamMembers: Pick<TeamMember, "id" | "name" | "email" | "avatar_url">[];
  isOpen: boolean;
  onClose: () => void;
};

export function InternalTaskDrawer({
  taskId,
  teamMembers,
  isOpen,
  onClose,
}: InternalTaskDrawerProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<InternalTaskDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [description, setDescription] = useState("");

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

  const refreshDetail = useCallback(async (id: string) => {
    const data = await loadInternalTaskDetail(id);
    setDetail(data);
    return data;
  }, []);

  useEffect(() => {
    if (!taskId || !isOpen) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    loadInternalTaskDetail(taskId)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
          if (!data) setError("Task not found.");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load task.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, taskId]);

  useEffect(() => {
    setDescription(detail?.task.description ?? "");
  }, [detail?.task.id, detail?.task.description]);

  function saveField(updates: Record<string, unknown>) {
    if (!detail) return;
    startTransition(async () => {
      const result = await updateInternalTask(
        detail.task.id,
        detail.task.project_id,
        updates,
      );
      if (result.error) {
        setError(result.error);
        toastError(result.error);
        return;
      }
      setError(null);
      toastSuccess("Task updated");
      await refreshDetail(detail.task.id);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!detail || !window.confirm(DELETE_TASK_CONFIRM_MESSAGE)) return;
    startTransition(async () => {
      const result = await deleteInternalTask(
        detail.task.id,
        detail.task.project_id,
      );
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Task deleted");
      closeInternalTaskDrawer();
      onClose();
    });
  }

  function handleClose() {
    closeInternalTaskDrawer();
    onClose();
  }

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Internal task details"
        className="absolute top-0 right-0 flex h-full w-full flex-col overflow-hidden border-l border-border bg-popover text-popover-foreground shadow-xl sm:w-[480px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative shrink-0 border-b border-border px-6 pb-4 pt-6 pr-14">
          <h2 className="text-lg font-semibold tracking-tight">Task details</h2>
          {detail ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {detail.project_name}
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleClose}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "absolute top-4 right-4",
            )}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-6 pb-6">
          {loading ? (
            <p className="py-6 text-sm text-muted-foreground">Loading…</p>
          ) : !detail ? (
            <p className="py-6 text-sm text-destructive">
              {error ?? "Task not found."}
            </p>
          ) : (
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto py-6">
              <Input
                defaultValue={detail.task.title}
                className="text-lg font-semibold"
                aria-label="Task title"
                onBlur={(event) => {
                  const value = event.target.value.trim();
                  if (value && value !== detail.task.title) {
                    saveField({ title: value });
                  }
                }}
              />

              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}

              <div>
                <label className={sheetFieldLabelClassName} htmlFor="internal_task_description">
                  Description
                </label>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  onBlur={() => {
                    const normalized = normalizeRichTextHtml(description) || null;
                    if (normalized !== (detail.task.description ?? null)) {
                      saveField({ description: normalized });
                    }
                  }}
                  placeholder="Add a description…"
                  className="mt-0"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={sheetFieldLabelClassName}>Status</label>
                  <select
                    value={detail.task.status}
                    className={sheetSelectClassName}
                    onChange={(event) =>
                      saveField({ status: event.target.value })
                    }
                  >
                    {getTaskStatusSelectOptions(detail.task.status).map(
                      (option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div>
                  <label className={sheetFieldLabelClassName}>Priority</label>
                  <select
                    value={detail.task.priority}
                    className={sheetSelectClassName}
                    onChange={(event) =>
                      saveField({ priority: event.target.value })
                    }
                  >
                    {priorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={sheetFieldLabelClassName}>Assignee</label>
                  <select
                    value={detail.task.assignee_id ?? ""}
                    className={sheetSelectClassName}
                    onChange={(event) =>
                      saveField({
                        assignee_id: event.target.value || null,
                      })
                    }
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={sheetFieldLabelClassName}>Due date</label>
                  <Input
                    type="date"
                    defaultValue={detail.task.due_date ?? ""}
                    onBlur={(event) => {
                      const value = event.target.value || null;
                      if (value !== detail.task.due_date) {
                        saveField({ due_date: value });
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <TaskPriorityBadge priority={detail.task.priority} />
              </div>

              {detail.comments.length > 0 ? (
                <div>
                  <h3 className={sheetFieldLabelClassName}>Comments</h3>
                  <ul className="mt-2 space-y-2">
                    {detail.comments.map((comment) => (
                      <li
                        key={comment.id}
                        className="rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        <p className="text-xs text-muted-foreground">
                          {comment.author_name ?? "Unknown"}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="border-t border-border pt-4">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                >
                  Delete task
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
