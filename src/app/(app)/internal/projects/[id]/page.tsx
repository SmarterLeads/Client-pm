import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { InternalProjectDetailTabs } from "@/components/internal/internal-project-detail-tabs";
import { InternalTaskDrawerProvider } from "@/components/internal/internal-task-drawer-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { getAttachmentsForEntity } from "@/lib/queries/attachments";
import {
  getInternalProjectById,
  getInternalProjectHealth,
  getInternalProjectMembers,
  getInternalProjectMilestones,
  getInternalProjectSections,
  getInternalTasks,
  getTeamMembersForInternalSelect,
} from "@/lib/queries/internal";

type InternalProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InternalProjectDetailPage({
  params,
}: InternalProjectDetailPageProps) {
  const { id } = await params;

  const result = await getInternalProjectById(id);
  if (!result) {
    notFound();
  }

  const { project } = result;

  const [
    health,
    sections,
    tasks,
    milestones,
    members,
    teamMembers,
    attachments,
  ] = await Promise.all([
    getInternalProjectHealth(project.id, project.due_date),
    getInternalProjectSections(project.id),
    getInternalTasks(project.id),
    getInternalProjectMilestones(project.id),
    getInternalProjectMembers(project.id),
    getTeamMembersForInternalSelect(),
    getAttachmentsForEntity("internal_project", project.id),
  ]);

  return (
    <div className="space-y-4">
      <Link
        href="/internal/projects"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to internal projects
      </Link>

      <Suspense fallback={<DetailSkeleton />}>
        <InternalTaskDrawerProvider teamMembers={teamMembers}>
          <InternalProjectDetailTabs
            project={project}
            health={health}
            sections={sections}
            tasks={tasks}
            milestones={milestones}
            members={members}
            teamMembers={teamMembers}
            attachments={attachments}
          />
        </InternalTaskDrawerProvider>
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
