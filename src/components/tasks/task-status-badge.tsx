import type { TaskStatus } from "@/lib/types";
import { TASK_STATUS_LABELS } from "@/lib/tasks/status-options";
import { cn } from "@/lib/utils";

const statusClassName: Record<TaskStatus, string> = {
  backlog: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  todo: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  in_progress:
    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  in_review:
    "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  done: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  cancelled: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
};

export function TaskStatusBadge({
  status,
  className,
}: {
  status: TaskStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-xs font-medium leading-none",
        statusClassName[status],
        className,
      )}
    >
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}
