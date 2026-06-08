import { ChangeHistoryTimeline } from "@/components/shared/change-history-timeline";
import { getProjectActivity } from "@/lib/queries/projects";

export async function ProjectActivityPanel({
  projectId,
}: {
  projectId: string;
}) {
  const entries = await getProjectActivity(projectId);
  return <ChangeHistoryTimeline entries={entries} />;
}
