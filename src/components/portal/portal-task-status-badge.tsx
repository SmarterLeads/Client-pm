import { Badge } from "@/components/ui/badge";
import type { TaskStatus } from "@/lib/types";

const labels: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To do",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
  cancelled: "Cancelled",
};

export function PortalTaskStatusBadge({ status }: { status: TaskStatus }) {
  const variant =
    status === "done"
      ? "default"
      : status === "in_progress" || status === "in_review"
        ? "secondary"
        : "outline";

  return <Badge variant={variant}>{labels[status]}</Badge>;
}
