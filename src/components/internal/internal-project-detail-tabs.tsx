"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { InternalProjectBoardTab } from "@/components/internal/internal-project-board-tab";
import { InternalProjectListTab } from "@/components/internal/internal-project-list-tab";
import { InternalProjectMembersTab } from "@/components/internal/internal-project-members-tab";
import { InternalProjectMilestonesTab } from "@/components/internal/internal-project-milestones-tab";
import { ProjectEditableHeader } from "@/components/projects/project-editable-header";
import { ProjectHealthWidget } from "@/components/projects/project-health-widget";
import { RichTextDisplay } from "@/components/shared/rich-text-display-lazy";
import { FileUploadZone } from "@/components/shared/file-upload-zone";
import type { AttachmentListItem } from "@/lib/attachments/types";
import { updateInternalProject } from "@/lib/actions/internal";
import type {
  InternalProjectHealth,
  InternalProjectMemberRow,
  InternalProjectTaskRow,
} from "@/lib/queries/internal";
import { cn } from "@/lib/utils";
import type {
  InternalMilestone,
  InternalProject,
  InternalProjectSection,
} from "@/lib/types/internal";
import type { TeamMember } from "@/lib/types";

const tabs = [
  { id: "board", label: "Board" },
  { id: "list", label: "List" },
  { id: "milestones", label: "Milestones" },
  { id: "members", label: "Members" },
  { id: "files", label: "Files" },
  { id: "activity", label: "Activity" },
] as const;

type TabId = (typeof tabs)[number]["id"];

type InternalProjectDetailTabsProps = {
  project: InternalProject;
  health: InternalProjectHealth;
  sections: InternalProjectSection[];
  tasks: InternalProjectTaskRow[];
  milestones: InternalMilestone[];
  members: InternalProjectMemberRow[];
  teamMembers: Pick<TeamMember, "id" | "name" | "email" | "avatar_url">[];
  attachments: AttachmentListItem[];
};

export function InternalProjectDetailTabs({
  project,
  health,
  sections,
  tasks,
  milestones,
  members,
  teamMembers,
  attachments,
}: InternalProjectDetailTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabId) || "board";

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <ProjectEditableHeader
          name={project.name}
          status={project.status}
          ragStatus={project.rag_status}
          dueDate={project.due_date}
          ownerId={project.owner_id}
          teamMembers={teamMembers}
          onUpdate={(updates) => updateInternalProject(project.id, updates)}
          subtitlePrefix={
            <span className="text-muted-foreground">Internal project</span>
          }
          footer={
            project.description ? (
              <RichTextDisplay className="mt-2 text-muted-foreground">
                {project.description}
              </RichTextDisplay>
            ) : null
          }
        />

        <ProjectHealthWidget health={health} />
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((tab) => {
          const href =
            tab.id === "board" ? pathname : `${pathname}?tab=${tab.id}`;

          return (
            <Link
              key={tab.id}
              href={href}
              className={cn(
                "shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {activeTab === "board" ? (
        <InternalProjectBoardTab
          projectId={project.id}
          sections={sections}
          tasks={tasks}
          teamMembers={teamMembers}
        />
      ) : null}

      {activeTab === "list" ? (
        <InternalProjectListTab
          projectId={project.id}
          sections={sections}
          tasks={tasks}
          teamMembers={teamMembers}
        />
      ) : null}

      {activeTab === "milestones" ? (
        <InternalProjectMilestonesTab milestones={milestones} />
      ) : null}

      {activeTab === "members" ? (
        <InternalProjectMembersTab members={members} />
      ) : null}

      {activeTab === "files" ? (
        <FileUploadZone
          entityType="internal_project"
          entityId={project.id}
          attachments={attachments}
        />
      ) : null}

      {activeTab === "activity" ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          Activity coming soon
        </p>
      ) : null}
    </div>
  );
}
