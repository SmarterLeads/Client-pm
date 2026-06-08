"use client";

import { Button } from "@/components/ui/button";
import { openQuickCreate } from "@/lib/stores/quick-create-store";

type MyTasksNewTaskButtonProps = {
  assigneeId: string;
};

export function MyTasksNewTaskButton({ assigneeId }: MyTasksNewTaskButtonProps) {
  return (
    <Button
      type="button"
      onClick={() =>
        openQuickCreate("task", {
          taskDefaults: { assigneeId },
        })
      }
    >
      New task
    </Button>
  );
}
