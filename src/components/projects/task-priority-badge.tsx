import { Badge } from "@/components/ui/badge";
import type { TaskPriority } from "@/lib/types";

const labels: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const colorClasses: Record<TaskPriority, string> = {
  low: "border-border bg-muted text-muted-foreground",
  medium: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  high: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  urgent: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
};

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Badge variant="outline" className={colorClasses[priority]}>
      {labels[priority]}
    </Badge>
  );
}
