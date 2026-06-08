import { ChangeHistoryTimeline } from "@/components/shared/change-history-timeline";
import { getChangeHistoryForEntity } from "@/lib/queries/change-history";

type ChangeHistoryProps = {
  entityType: string;
  entityId: string;
};

export async function ChangeHistory({
  entityType,
  entityId,
}: ChangeHistoryProps) {
  const entries = await getChangeHistoryForEntity(entityType, entityId);
  return <ChangeHistoryTimeline entries={entries} />;
}
