import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectActivityPanel } from "@/components/projects/project-activity-panel";
import { ProjectDetailTabs } from "@/components/projects/project-detail-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { getAttachmentsForEntity } from "@/lib/queries/attachments";
import {
  getProjectById,
  getProjectHealth,
  getProjectMembers,
  getProjectMilestones,
  getProjectSections,
  getProjectTasks,
  getTeamMembersForSelect,
} from "@/lib/queries/projects";
import { getTeamMember } from "@/lib/auth/session";
import type { TaskViewPreference } from "@/lib/actions/team-preferences";

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { id } = await params;

  const teamMember = await getTeamMember();
  if (!teamMember) {
    notFound();
  }

  const result = await getProjectById(id);
  if (!result) {
    notFound();
  }

  const { project, client_name, template_name, legacy_owner } = result;

  const [
    health,
    sections,
    tasks,
    milestones,
    members,
    teamMembers,
    attachments,
  ] = await Promise.all([
    getProjectHealth(project.id, project.due_date),
    getProjectSections(project.id),
    getProjectTasks(project.id),
    getProjectMilestones(project.id),
    getProjectMembers(project.id),
    getTeamMembersForSelect(),
    getAttachmentsForEntity("project", project.id),
  ]);

  const taskViewPreference = (teamMember.task_view_preference === "board"
    ? "board"
    : "list") as TaskViewPreference;

  return (
    <div className="space-y-4">
      <Link
        href="/projects"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to projects
      </Link>

      <Suspense fallback={<DetailSkeleton />}>
        <ProjectDetailTabs
          project={project}
          clientName={client_name}
          templateName={template_name}
          legacyOwner={legacy_owner}
          health={health}
          sections={sections}
          tasks={tasks}
          milestones={milestones}
          members={members}
          activityPanel={
            <ProjectActivityPanel projectId={project.id} />
          }
          teamMembers={teamMembers}
          attachments={attachments}
          taskViewPreference={taskViewPreference}
          currentTeamMemberId={teamMember.id}
        />
      </Suspense>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
