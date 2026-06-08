"use client";

import { useRouter } from "next/navigation";
import { MyTasksList } from "@/components/tasks/my-tasks-list";
import type { GroupedMyTasks } from "@/lib/queries/tasks";

type MyTasksListShellProps = {
  groups: GroupedMyTasks;
  hasActiveFilters: boolean;
};

export function MyTasksListShell({
  groups,
  hasActiveFilters,
}: MyTasksListShellProps) {
  const router = useRouter();

  return (
    <MyTasksList
      groups={groups}
      hasActiveFilters={hasActiveFilters}
      onClearFilters={() => router.replace("/tasks")}
    />
  );
}
