import { Badge } from "@/components/ui/badge";
import type { ProjectStatus } from "@/lib/types";

const labels: Record<ProjectStatus, string> = {
  planned: "Planned",
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const variant =
    status === "active"
      ? "default"
      : status === "completed"
        ? "secondary"
        : "outline";

  return <Badge variant={variant}>{labels[status]}</Badge>;
}
