"use client";

import { useRouter } from "next/navigation";
import { MyTasksList } from "@/components/tasks/my-tasks-list";
import type { GroupedMyTasks } from "@/lib/queries/tasks";

type MyTasksListShellProps = {
  groups: GroupedMyTasks;
  hasActiveFilters: boolean;
  assignee: { name: string; avatar_url: string | null };
};

export function MyTasksListShell({
  groups,
  hasActiveFilters,
  assignee,
}: MyTasksListShellProps) {
  const router = useRouter();

  return (
    <MyTasksList
      groups={groups}
      hasActiveFilters={hasActiveFilters}
      assignee={assignee}
      onClearFilters={() => router.replace("/tasks")}
    />
  );
}
