"use client";

import { useRouter } from "next/navigation";
import {
  useActionState,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { TaskPriorityBadge } from "@/components/projects/task-priority-badge";
import { RecurrenceSection } from "@/components/tasks/recurrence-section";
import { FileUploadZone } from "@/components/shared/file-upload-zone";
import {
  addDependency,
  createComment,
  createTask,
  deleteComment,
  deleteTask,
  deleteTimeEntry,
  loadTaskDetail,
  logTime,
  removeDependency,
  updateTask,
  type TaskFormState,
} from "@/lib/actions/tasks";
import { useActionToast } from "@/hooks/use-action-toast";
import type { TaskDetail } from "@/lib/queries/tasks";
import { toastError, toastSuccess } from "@/lib/toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sheetFieldLabelClassName, sheetInputClassName, sheetSelectClassName, sheetTextareaClassName } from "@/components/ui/sheet-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { TeamMember } from "@/lib/types";
import { closeTaskDrawer } from "@/lib/stores/task-drawer-store";
import { cn } from "@/lib/utils";
import { DELETE_TASK_CONFIRM_MESSAGE } from "@/lib/tasks/constants";
import { PmEnumValues } from "@/lib/types/enums";
import { XIcon } from "lucide-react";

const statuses = PmEnumValues.task_status;
const priorities = PmEnumValues.task_priority;

const commentInitial: TaskFormState = {};
const timeInitial: TaskFormState = {};
const subtaskInitial: TaskFormState = {};

type TaskDrawerProps = {
  taskId: string | null;
  teamMembers: Pick<TeamMember, "id" | "name" | "email" | "avatar_url">[];
  isOpen: boolean;
  onClose: () => void;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function TaskDrawer({
  taskId,
  teamMembers,
  isOpen,
  onClose,
}: TaskDrawerProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [showLogTime, setShowLogTime] = useState(false);
  const [mounted, setMounted] = useState(false);

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
    const data = await loadTaskDetail(id);
    setDetail(data);
    return data;
  }, []);

  useEffect(() => {
    if (!taskId) {
      setDetail(null);
      setError(null);
      setShowLogTime(false);
      return;
    }

    if (!isOpen) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    loadTaskDetail(taskId)
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

  function saveField(updates: Record<string, unknown>) {
    if (!detail) return;
    startTransition(async () => {
      const result = await updateTask(
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
      const result = await deleteTask(
        detail.task.id,
        detail.task.project_id,
      );
      if (result.error) {
        setError(result.error);
        toastError(result.error);
        return;
      }
      toastSuccess("Task deleted");
      closeTaskDrawer();
      onClose();
    });
  }

  const totalMinutes = detail?.time_entries.reduce(
    (s, e) => s + e.duration_minutes,
    0,
  ) ?? 0;

  function handleClose() {
    closeTaskDrawer();
    onClose();
  }

  if (!isOpen || !mounted) {
    return null;
  }

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
        aria-label="Task details"
        className="absolute top-0 right-0 flex h-full w-full flex-col overflow-hidden border-l border-border bg-popover text-popover-foreground shadow-xl sm:w-[480px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative shrink-0 border-b border-border px-6 pb-4 pt-6 pr-14">
          <h2 className="text-lg font-semibold tracking-tight">Task details</h2>
          {detail ? (
            <p className="mt-1 text-sm text-gray-500 dark:text-muted-foreground">
              {detail.project_name} · {detail.client_name}
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
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !detail ? (
          <p className="text-sm text-destructive">{error ?? "Task not found."}</p>
        ) : (
            <>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto py-6">
              <Input
                defaultValue={detail.task.title}
                className="text-lg font-semibold"
                aria-label="Task title"
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== detail.task.title) {
                    saveField({ title: e.target.value.trim() });
                  }
                }}
              />
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}

              <div>
                <label className={sheetFieldLabelClassName} htmlFor="task_description">
                  Description
                </label>
                <Textarea
                  id="task_description"
                  defaultValue={detail.task.description ?? ""}
                  className={cn(sheetTextareaClassName, "mt-0")}
                  onBlur={(e) => {
                    const val = e.target.value.trim() || null;
                    if (val !== (detail.task.description ?? null)) {
                      saveField({ description: val });
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FieldSelect
                  label="Status"
                  value={detail.task.status}
                  options={statuses.map((s) => ({
                    value: s,
                    label: s.replace("_", " "),
                  }))}
                  onChange={(v) => saveField({ status: v })}
                />
                <FieldSelect
                  label="Priority"
                  value={detail.task.priority}
                  options={priorities.map((p) => ({
                    value: p,
                    label: p.charAt(0).toUpperCase() + p.slice(1),
                  }))}
                  onChange={(v) => saveField({ priority: v })}
                />
                <FieldSelect
                  label="Assignee"
                  value={detail.task.assignee_id ?? ""}
                  options={[
                    { value: "", label: "Unassigned" },
                    ...teamMembers.map((m) => ({ value: m.id, label: m.name })),
                  ]}
                  onChange={(v) => saveField({ assignee_id: v || null })}
                />
                <div>
                  <label className={sheetFieldLabelClassName} htmlFor="due_date">
                    Due date
                  </label>
                  <Input
                    id="due_date"
                    type="date"
                    defaultValue={detail.task.due_date ?? ""}
                    className={sheetInputClassName}
                    onBlur={(e) =>
                      saveField({ due_date: e.target.value || null })
                    }
                  />
                </div>
                <FieldSelect
                  label="Section"
                  value={detail.task.section_id ?? ""}
                  options={[
                    { value: "", label: "None" },
                    ...detail.sections.map((s) => ({
                      value: s.id,
                      label: s.name,
                    })),
                  ]}
                  onChange={(v) => saveField({ section_id: v || null })}
                />
                <div>
                  <label className={sheetFieldLabelClassName} htmlFor="estimated_hours">
                    Est. hours
                  </label>
                  <Input
                    id="estimated_hours"
                    type="number"
                    min={0}
                    step={0.5}
                    defaultValue={detail.task.estimated_hours ?? ""}
                    className={sheetInputClassName}
                    onBlur={(e) =>
                      saveField({
                        estimated_hours: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                  />
                </div>
              </div>

              <RecurrenceSection
                task={detail.task}
                projectId={detail.task.project_id}
                onUpdated={() => refreshDetail(detail.task.id)}
              />

              <SubtasksSection
                detail={detail}
                onRefresh={() => refreshDetail(detail.task.id)}
              />

              <DependenciesSection
                detail={detail}
                onRefresh={() => refreshDetail(detail.task.id)}
              />

              <Tabs defaultValue="comments">
                <TabsList variant="line" className="w-full">
                  <TabsTrigger value="comments">
                    Comments ({detail.comments.length})
                  </TabsTrigger>
                  <TabsTrigger value="time">
                    Time ({formatMinutes(totalMinutes)})
                  </TabsTrigger>
                  <TabsTrigger value="files">
                    Files ({detail.attachments.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="comments" className="mt-4 space-y-4">
                  <CommentsSection
                    taskId={detail.task.id}
                    projectId={detail.task.project_id}
                    comments={detail.comments}
                    onRefresh={() => refreshDetail(detail.task.id)}
                  />
                </TabsContent>

                <TabsContent value="time" className="mt-4 space-y-4">
                  <TimeLogSection
                    taskId={detail.task.id}
                    projectId={detail.task.project_id}
                    entries={detail.time_entries}
                    totalMinutes={totalMinutes}
                    showForm={showLogTime}
                    onToggleForm={() => setShowLogTime((v) => !v)}
                    onRefresh={() => refreshDetail(detail.task.id)}
                  />
                </TabsContent>

                <TabsContent value="files" className="mt-4 space-y-4">
                  <FileUploadZone
                    entityType="task"
                    entityId={detail.task.id}
                    attachments={detail.attachments}
                  />
                </TabsContent>
              </Tabs>
            </div>

            <div className="shrink-0 border-t border-border pt-4">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
              >
                Delete task
              </Button>
            </div>
          </>
        )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function FieldSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className={sheetFieldLabelClassName}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={sheetSelectClassName}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SubtasksSection({
  detail,
  onRefresh,
}: {
  detail: TaskDetail;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (prev: TaskFormState, fd: FormData) => {
      const result = await createTask(prev, fd);
      if (result.success) {
        onRefresh();
        router.refresh();
      }
      return result;
    },
    subtaskInitial,
  );

  useActionToast(state, { successMessage: "Subtask created" });

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">Subtasks</h3>
      {detail.subtasks.length === 0 ? (
        <p className="text-xs text-muted-foreground">No subtasks yet.</p>
      ) : (
        <ul className="space-y-1">
          {detail.subtasks.map((st) => (
            <li
              key={st.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
            >
              <span>{st.title}</span>
              <TaskPriorityBadge priority={st.priority} />
            </li>
          ))}
        </ul>
      )}
      <form action={formAction} className="flex gap-2">
        <input type="hidden" name="project_id" value={detail.task.project_id} />
        <input type="hidden" name="parent_task_id" value={detail.task.id} />
        <Input
          name="title"
          placeholder="Add subtask…"
          required
          className="h-8 flex-1"
        />
        <Button type="submit" size="sm" disabled={pending}>
          Add
        </Button>
      </form>
      {state.error ? (
        <p className="text-xs text-destructive">{state.error}</p>
      ) : null}
    </section>
  );
}

function DependenciesSection({
  detail,
  onRefresh,
}: {
  detail: TaskDetail;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState("");

  function handleAdd() {
    if (!selected) return;
    startTransition(async () => {
      const result = await addDependency(
        detail.task.id,
        detail.task.project_id,
        selected,
      );
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Dependency added");
      setSelected("");
      onRefresh();
      router.refresh();
    });
  }

  function handleRemove(depId: string) {
    startTransition(async () => {
      const result = await removeDependency(
        detail.task.id,
        detail.task.project_id,
        depId,
      );
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Dependency removed");
      onRefresh();
      router.refresh();
    });
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">Blocked by</h3>
      {detail.dependencies.length === 0 ? (
        <p className="text-xs text-muted-foreground">No dependencies.</p>
      ) : (
        <ul className="space-y-1">
          {detail.dependencies.map((dep) => (
            <li
              key={dep.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
            >
              <span>{dep.depends_on_title}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => handleRemove(dep.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="h-8 flex-1 rounded-lg border border-input px-2.5 text-sm dark:bg-input/30"
        >
          <option value="">Select task…</option>
          {detail.project_tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          disabled={!selected || isPending}
          onClick={handleAdd}
        >
          Add
        </Button>
      </div>
    </section>
  );
}

function CommentsSection({
  taskId,
  projectId,
  comments,
  onRefresh,
}: {
  taskId: string;
  projectId: string;
  comments: TaskDetail["comments"];
  onRefresh: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (prev: TaskFormState, fd: FormData) => {
      const result = await createComment(taskId, projectId, prev, fd);
      if (result.success) {
        onRefresh();
        router.refresh();
      }
      return result;
    },
    commentInitial,
  );
  useActionToast(state, { successMessage: "Comment added" });
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm">{c.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.author_name ?? "Unknown"} · {formatDateTime(c.created_at)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await deleteComment(taskId, projectId, c.id);
                      if (result.error) {
                        toastError(result.error);
                        return;
                      }
                      toastSuccess("Comment deleted");
                      onRefresh();
                      router.refresh();
                    })
                  }
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form action={formAction} className="space-y-2">
        <Textarea name="body" placeholder="Add a comment…" rows={3} required />
        {state.fieldErrors?.body?.[0] ? (
          <p className="text-xs text-destructive">{state.fieldErrors.body[0]}</p>
        ) : null}
        {state.error ? (
          <p className="text-xs text-destructive">{state.error}</p>
        ) : null}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Posting…" : "Post comment"}
        </Button>
      </form>
    </div>
  );
}

function TimeLogSection({
  taskId,
  projectId,
  entries,
  totalMinutes,
  showForm,
  onToggleForm,
  onRefresh,
}: {
  taskId: string;
  projectId: string;
  entries: TaskDetail["time_entries"];
  totalMinutes: number;
  showForm: boolean;
  onToggleForm: () => void;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [state, formAction, pending] = useActionState(
    async (prev: TaskFormState, fd: FormData) => {
      const result = await logTime(taskId, projectId, prev, fd);
      if (result.success) {
        onRefresh();
        router.refresh();
        onToggleForm();
      }
      return result;
    },
    timeInitial,
  );
  useActionToast(state, { successMessage: "Time logged" });
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Total: {formatMinutes(totalMinutes)}
        </p>
        <Button type="button" size="sm" variant="outline" onClick={onToggleForm}>
          {showForm ? "Cancel" : "Log time"}
        </Button>
      </div>

      {showForm ? (
        <form action={formAction} className="space-y-5 rounded-lg border border-border p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="hours" className={sheetFieldLabelClassName}>Hours</label>
              <Input id="hours" name="hours" type="number" min={0} defaultValue={0} className={sheetInputClassName} />
            </div>
            <div>
              <label htmlFor="minutes" className={sheetFieldLabelClassName}>Minutes</label>
              <Input id="minutes" name="minutes" type="number" min={0} max={59} defaultValue={30} className={sheetInputClassName} />
            </div>
          </div>
          <div>
            <label htmlFor="logged_date" className={sheetFieldLabelClassName}>Date</label>
            <Input id="logged_date" name="logged_date" type="date" defaultValue={today} required className={sheetInputClassName} />
          </div>
          <div>
            <label htmlFor="time_description" className={sheetFieldLabelClassName}>Description</label>
            <Input id="time_description" name="description" className={sheetInputClassName} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="billable" value="true" defaultChecked className="size-4 rounded" />
            Billable
          </label>
          {state.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save entry"}
          </Button>
        </form>
      ) : null}

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No time logged yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{formatMinutes(e.duration_minutes)}</p>
                <p className="text-xs text-muted-foreground">
                  {e.logged_date} · {e.logger_name ?? "—"}
                  {e.billable ? " · Billable" : ""}
                  {e.description ? ` · ${e.description}` : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteTimeEntry(taskId, projectId, e.id);
                    if (result.error) {
                      toastError(result.error);
                      return;
                    }
                    toastSuccess("Time entry deleted");
                    onRefresh();
                    router.refresh();
                  })
                }
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
