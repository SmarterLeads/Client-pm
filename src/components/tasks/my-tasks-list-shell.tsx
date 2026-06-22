"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MyTasksList } from "@/components/tasks/my-tasks-list";
import type { GroupedMyTasks, MyTaskRow } from "@/lib/queries/tasks";

type MyTasksListShellProps = {
  groups: GroupedMyTasks;
  completedTasks: MyTaskRow[];
  completedCount: number;
  showCompleted: boolean;
  hasActiveFilters: boolean;
  assignee: { name: string; avatar_url: string | null };
};

export function MyTasksListShell({
  groups,
  completedTasks,
  completedCount,
  showCompleted,
  hasActiveFilters,
  assignee,
}: MyTasksListShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("client");
    params.delete("due");
    const query = params.toString();
    router.replace(query ? `/tasks?${query}` : "/tasks");
  }

  return (
    <MyTasksList
      groups={groups}
      completedTasks={completedTasks}
      completedCount={completedCount}
      showCompleted={showCompleted}
      hasActiveFilters={hasActiveFilters}
      assignee={assignee}
      onClearFilters={clearFilters}
    />
  );
}
