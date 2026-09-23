"use client";

import { LayoutTemplate } from "lucide-react";
import { useState } from "react";

import { AddTaskFromTemplateSheet } from "@/components/tasks/add-task-from-template-sheet";
import { QuickAddTaskForm } from "@/components/tasks/quick-add-task-form";
import { useTaskDrawer } from "@/components/tasks/task-drawer-provider";
import { Button } from "@/components/ui/button";
import type { ProjectSection, TeamMember } from "@/lib/types";

type ProjectSectionAddTaskRowProps = {
  projectId: string;
  sectionId: string;
  sections: ProjectSection[];
  teamMembers: Pick<TeamMember, "id" | "name">[];
  currentTeamMemberId: string;
};

export function ProjectSectionAddTaskRow({
  projectId,
  sectionId,
  sections,
  teamMembers,
  currentTeamMemberId,
}: ProjectSectionAddTaskRowProps) {
  const { openTask } = useTaskDrawer();
  const [templateOpen, setTemplateOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <QuickAddTaskForm
          projectId={projectId}
          sectionId={sectionId}
          sections={sections}
          teamMembers={teamMembers}
          currentTeamMemberId={currentTeamMemberId}
          className="min-w-[8rem] flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => setTemplateOpen(true)}
        >
          <LayoutTemplate className="size-4" />
          From template
        </Button>
      </div>
      <AddTaskFromTemplateSheet
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        projectId={projectId}
        sectionId={sectionId}
        onTaskCreated={(taskId) => openTask(taskId)}
      />
    </>
  );
}
