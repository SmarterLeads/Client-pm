"use client";

import { LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ProjectStatusBadge } from "@/components/clients/project-status-badge";
import { RagDot } from "@/components/clients/rag-dot";
import { ProjectBoardTab } from "@/components/projects/project-board-tab";
import { ProjectHealthWidget } from "@/components/projects/project-health-widget";
import { ProjectListTab } from "@/components/projects/project-list-tab";
import { ProjectMembersTab } from "@/components/projects/project-members-tab";
import { ProjectMilestonesTab } from "@/components/projects/project-milestones-tab";
import { FileUploadZone } from "@/components/shared/file-upload-zone";
import type { AttachmentListItem } from "@/lib/attachments/types";
import { cn } from "@/lib/utils";
import type {
  ProjectHealth,
  ProjectMemberRow,
  ProjectTaskRow,
} from "@/lib/queries/projects";
import type { Milestone, Project, ProjectSection, TeamMember } from "@/lib/types";

const tabs = [
  { id: "board", label: "Board" },
  { id: "list", label: "List" },
  { id: "milestones", label: "Milestones" },
  { id: "members", label: "Members" },
  { id: "files", label: "Files" },
  { id: "activity", label: "Activity" },
] as const;

type TabId = (typeof tabs)[number]["id"];

type ProjectDetailTabsProps = {
  project: Project;
  clientName: string;
  ownerName: string | null;
  templateName: string | null;
  health: ProjectHealth;
  sections: ProjectSection[];
  tasks: ProjectTaskRow[];
  milestones: Milestone[];
  members: ProjectMemberRow[];
  activityPanel: React.ReactNode;
  teamMembers: Pick<TeamMember, "id" | "name" | "email" | "avatar_url">[];
  attachments: AttachmentListItem[];
};

function formatDueDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ProjectDetailTabs({
  project,
  clientName,
  ownerName,
  templateName,
  health,
  sections,
  tasks,
  milestones,
  members,
  activityPanel,
  teamMembers,
  attachments,
}: ProjectDetailTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabId) || "board";
  const dueLabel = formatDueDate(project.due_date);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {project.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              <Link
                href={`/clients/${project.client_id}`}
                className="hover:underline"
              >
                {clientName}
              </Link>
              {ownerName ? ` · ${ownerName}` : ""}
              {dueLabel ? ` · Due ${dueLabel}` : ""}
            </p>
            {templateName ? (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <LayoutTemplate className="size-3.5" />
                Template: {templateName}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <RagDot status={project.rag_status} />
            <ProjectStatusBadge status={project.status} />
          </div>
        </div>

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
        <ProjectBoardTab
          projectId={project.id}
          sections={sections}
          tasks={tasks}
          teamMembers={teamMembers}
        />
      ) : null}

      {activeTab === "list" ? (
        <ProjectListTab
          projectId={project.id}
          sections={sections}
          tasks={tasks}
          teamMembers={teamMembers}
        />
      ) : null}

      {activeTab === "milestones" ? (
        <ProjectMilestonesTab
          projectId={project.id}
          milestones={milestones}
        />
      ) : null}

      {activeTab === "members" ? (
        <ProjectMembersTab
          projectId={project.id}
          members={members}
          teamMembers={teamMembers}
        />
      ) : null}

      {activeTab === "files" ? (
        <FileUploadZone
          entityType="project"
          entityId={project.id}
          attachments={attachments}
        />
      ) : null}

      {activeTab === "activity" ? activityPanel : null}
    </div>
  );
}
