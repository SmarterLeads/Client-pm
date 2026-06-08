import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PortalProjectDetailTabs } from "@/components/portal/portal-project-detail-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { getClientUser } from "@/lib/auth/session";
import { getAttachmentsForEntity } from "@/lib/queries/attachments";
import {
  getPortalProjectById,
  getPortalProjectMilestones,
  getPortalProjectTasksBySection,
} from "@/lib/queries/portal";

type PortalProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PortalProjectDetailPage({
  params,
}: PortalProjectDetailPageProps) {
  const { id } = await params;
  const clientUser = await getClientUser();

  const [project, milestones, sections, attachments] = await Promise.all([
    getPortalProjectById(id),
    getPortalProjectMilestones(id),
    getPortalProjectTasksBySection(id),
    getAttachmentsForEntity("project", id),
  ]);

  if (!project) {
    notFound();
  }

  const canApprove = clientUser?.access_level === "approver";

  return (
    <Suspense fallback={<DetailSkeleton />}>
      <PortalProjectDetailTabs
        project={project}
        milestones={milestones}
        sections={sections}
        attachments={attachments}
        canApprove={canApprove}
      />
    </Suspense>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
