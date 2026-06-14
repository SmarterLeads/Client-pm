"use server";

import type { ClientActivityLogFilters } from "@/lib/clients/activity-log";
import { getClientActivityLog } from "@/lib/queries/clients";

export async function loadMoreClientActivity(
  clientId: string,
  filters: ClientActivityLogFilters,
  page: number,
) {
  return getClientActivityLog(clientId, filters, page);
}
