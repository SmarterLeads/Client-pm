"use client";

import { Plus } from "lucide-react";

import { useTaskDrawer } from "@/components/tasks/task-drawer-provider";
import { Button } from "@/components/ui/button";
import type { ProjectSection, TeamMember } from "@/lib/types";

type QuickAddTaskFormProps = {
  projectId: string;
  sectionId: string;
  sections: ProjectSection[];
  teamMembers: Pick<TeamMember, "id" | "name">[];
  currentTeamMemberId: string;
};

export function QuickAddTaskForm({
  projectId,
  sectionId,
  sections,
  currentTeamMemberId,
}: QuickAddTaskFormProps) {
  const { openCreateTask } = useTaskDrawer();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="w-full justify-start text-muted-foreground"
      onClick={() =>
        openCreateTask({
          projectId,
          sectionId,
          assigneeId: currentTeamMemberId,
          sections,
        })
      }
    >
      <Plus className="size-4" />
      New task
    </Button>
  );
}
