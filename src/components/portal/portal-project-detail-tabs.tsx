"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PortalAttachmentList } from "@/components/portal/portal-attachment-list";
import { PortalMilestonesList } from "@/components/portal/portal-milestones-list";
import { PortalTasksBySection } from "@/components/portal/portal-tasks-by-section";
import { ProjectStatusBadge } from "@/components/clients/project-status-badge";
import { RagDot } from "@/components/clients/rag-dot";
import { RichTextDisplay } from "@/components/shared/rich-text-display-lazy";
import type { AttachmentListItem } from "@/lib/attachments/types";
import type {
  PortalMilestoneRow,
  PortalProjectDetail,
  PortalSectionWithTasks,
} from "@/lib/portal/types";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "files", label: "Files" },
] as const;

type TabId = (typeof tabs)[number]["id"];

type PortalProjectDetailTabsProps = {
  project: PortalProjectDetail;
  milestones: PortalMilestoneRow[];
  sections: PortalSectionWithTasks[];
  attachments: AttachmentListItem[];
  canApprove: boolean;
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PortalProjectDetailTabs({
  project,
  milestones,
  sections,
  attachments,
  canApprove,
}: PortalProjectDetailTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabId) || "overview";
  const dueLabel = formatDate(project.due_date);

  return (
    <div className="space-y-8">
      <Link
        href="/portal/projects"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        â† Back to projects
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {project.name}
          </h1>
          {dueLabel ? (
            <p className="text-sm text-muted-foreground">Due {dueLabel}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <RagDot status={project.rag_status} />
          <ProjectStatusBadge status={project.status} />
        </div>
      </div>

      {project.description ? (
        <RichTextDisplay className="max-w-3xl text-muted-foreground">
          {project.description}
        </RichTextDisplay>
      ) : null}

      <nav className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((tab) => {
          const href =
            tab.id === "overview" ? pathname : `${pathname}?tab=${tab.id}`;

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

      {activeTab === "overview" ? (
        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Progress</h2>
            <PortalTasksBySection sections={sections} />
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Milestones</h2>
            <PortalMilestonesList
              projectId={project.id}
              milestones={milestones}
              canApprove={canApprove}
            />
          </section>
        </div>
      ) : null}

      {activeTab === "files" ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Files</h2>
          <PortalAttachmentList attachments={attachments} />
        </section>
      ) : null}
    </div>
  );
}
