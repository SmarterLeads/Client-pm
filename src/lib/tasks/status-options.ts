import type { TaskStatus } from "@/lib/types";

/** Task statuses shown in dropdowns and used for new tasks. */
export const UI_TASK_STATUSES = [
  "todo",
  "in_progress",
  "in_review",
  "done",
] as const satisfies readonly TaskStatus[];

export type UiTaskStatus = (typeof UI_TASK_STATUSES)[number];

/** Display labels for all enum values (including legacy statuses on existing tasks). */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Completed",
  cancelled: "Cancelled",
};

export const UI_TASK_STATUS_OPTIONS: { value: UiTaskStatus; label: string }[] =
  UI_TASK_STATUSES.map((value) => ({
    value,
    label: TASK_STATUS_LABELS[value],
  }));

export function isUiTaskStatus(status: TaskStatus): status is UiTaskStatus {
  return (UI_TASK_STATUSES as readonly TaskStatus[]).includes(status);
}

/** Dropdown options: the 4 UI statuses, plus the current value when it is legacy-only. */
export function getTaskStatusSelectOptions(currentStatus?: TaskStatus): {
  value: TaskStatus;
  label: string;
}[] {
  if (currentStatus && !isUiTaskStatus(currentStatus)) {
    return [
      {
        value: currentStatus,
        label: `${TASK_STATUS_LABELS[currentStatus]} (legacy)`,
      },
      ...UI_TASK_STATUS_OPTIONS,
    ];
  }
  return [...UI_TASK_STATUS_OPTIONS];
}
