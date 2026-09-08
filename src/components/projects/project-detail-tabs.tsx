"use client";

import { LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { ProjectBoardTab } from "@/components/projects/project-board-tab";
import { ProjectEditableHeader } from "@/components/projects/project-editable-header";
import { ProjectHealthWidget } from "@/components/projects/project-health-widget";
import { ProjectListTab } from "@/components/projects/project-list-tab";
import { ProjectMembersTab } from "@/components/projects/project-members-tab";
import { ProjectMilestonesTab } from "@/components/projects/project-milestones-tab";
import { FileUploadZone } from "@/components/shared/file-upload-zone";
import type { AttachmentListItem } from "@/lib/attachments/types";
import { updateProject } from "@/lib/actions/projects";
import {
  updateTaskViewPreference,
  type TaskViewPreference,
} from "@/lib/actions/team-preferences";
import { resolveProjectListMembers } from "@/lib/projects/members";
import { cn } from "@/lib/utils";
import type {
  ProjectHealth,
  ProjectListMember,
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
  templateName: string | null;
  legacyOwner?: ProjectListMember | null;
  health: ProjectHealth;
  sections: ProjectSection[];
  tasks: ProjectTaskRow[];
  milestones: Milestone[];
  members: ProjectMemberRow[];
  activityPanel: React.ReactNode;
  teamMembers: Pick<TeamMember, "id" | "name" | "email" | "avatar_url">[];
  attachments: AttachmentListItem[];
  taskViewPreference: TaskViewPreference;
  currentTeamMemberId: string;
};

export function ProjectDetailTabs({
  project,
  clientName,
  templateName,
  legacyOwner = null,
  health,
  sections,
  tasks,
  milestones,
  members,
  activityPanel,
  teamMembers,
  attachments,
  taskViewPreference,
  currentTeamMemberId,
}: ProjectDetailTabsProps) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const [, startTransition] = useTransition();
  const tabParam = searchParams.get("tab") as TabId | null;
  const defaultTaskTab: TabId =
    taskViewPreference === "board" ? "board" : "list";
  const activeTab = tabParam ?? defaultTaskTab;
  const headerMembers = resolveProjectListMembers(members, legacyOwner);

  function saveTaskViewPreference(preference: TaskViewPreference) {
    startTransition(async () => {
      await updateTaskViewPreference(preference);
    });
  }

  function taskTabHref(tab: "board" | "list"): string {
    return tab === "board" ? pathname : `${pathname}?tab=list`;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <ProjectEditableHeader
          name={project.name}
          status={project.status}
          ragStatus={project.rag_status}
          members={headerMembers}
          onUpdate={(updates) => updateProject(project.id, updates)}
          subtitlePrefix={
            <Link
              href={`/clients/${project.client_id}`}
              className="hover:underline"
            >
              {clientName}
            </Link>
          }
          footer={
            templateName ? (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <LayoutTemplate className="size-3.5" />
                Template: {templateName}
              </p>
            ) : null
          }
        />

        <ProjectHealthWidget health={health} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex gap-1 overflow-x-auto border-b border-border sm:border-none">
          {tabs.map((tab) => {
            const href =
              tab.id === "board" ? taskTabHref("board") : tab.id === "list"
                ? taskTabHref("list")
                : `${pathname}?tab=${tab.id}`;

            return (
              <Link
                key={tab.id}
                href={href}
                onClick={() => {
                  if (tab.id === "board" || tab.id === "list") {
                    saveTaskViewPreference(tab.id);
                  }
                }}
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
      </div>

      {activeTab === "board" ? (
        <ProjectBoardTab
          projectId={project.id}
          sections={sections}
          tasks={tasks}
          teamMembers={teamMembers}
          currentTeamMemberId={currentTeamMemberId}
        />
      ) : null}

      {activeTab === "list" ? (
        <ProjectListTab
          projectId={project.id}
          sections={sections}
          tasks={tasks}
          teamMembers={teamMembers}
          currentTeamMemberId={currentTeamMemberId}
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
