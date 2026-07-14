"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTaskDrawer } from "@/components/tasks/task-drawer-provider";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { markTaskReviewed } from "@/lib/actions/tasks";
import type { TaskToReviewRow } from "@/lib/queries/tasks";
import { toast } from "sonner";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TasksToReviewSection({
  tasks,
  compact = false,
}: {
  tasks: TaskToReviewRow[];
  compact?: boolean;
}) {
  const { openTask } = useTaskDrawer();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleReview(task: TaskToReviewRow) {
    startTransition(async () => {
      const result = await markTaskReviewed(task.id, task.project_id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Task marked as reviewed");
      router.refresh();
    });
  }

  if (tasks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No tasks waiting for review.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            {!compact ? <TableHead>Project</TableHead> : null}
            {!compact ? <TableHead>Client</TableHead> : null}
            <TableHead>Assignee</TableHead>
            <TableHead>Completed</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell>
                <button
                  type="button"
                  onClick={() => openTask(task.id)}
                  className="font-medium text-left hover:underline"
                >
                  {task.title}
                </button>
                {compact ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {task.project_name} · {task.client_name}
                  </p>
                ) : null}
              </TableCell>
              {!compact ? (
                <TableCell className="text-muted-foreground">
                  {task.project_name}
                </TableCell>
              ) : null}
              {!compact ? (
                <TableCell className="text-muted-foreground">
                  {task.client_name}
                </TableCell>
              ) : null}
              <TableCell className="text-muted-foreground">
                {task.assignee_name ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {formatDateTime(task.completed_at)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => handleReview(task)}
                >
                  Mark as Reviewed
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
