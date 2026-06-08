import { ChangeHistoryTimeline } from "@/components/shared/change-history-timeline";
import { getClientHistory } from "@/lib/queries/clients";

export async function ClientHistoryPanel({ clientId }: { clientId: string }) {
  const entries = await getClientHistory(clientId);
  return <ChangeHistoryTimeline entries={entries ?? []} />;
}
