/** Client lifecycle values on public.clients used by marketing views. */
export const MARKETING_CHURNED_STATUS = "churned";
export const MARKETING_PAUSED_STATUS = "on_hold";
export const MARKETING_ACTIVE_STATUS = "active";

/** Dashboard list statuses when "Show paused clients" is off. */
export const MARKETING_DASHBOARD_ACTIVE_STATUSES = [
  MARKETING_ACTIVE_STATUS,
] as const;

/** Dashboard list statuses when paused clients are included. */
export const MARKETING_DASHBOARD_WITH_PAUSED_STATUSES = [
  MARKETING_ACTIVE_STATUS,
  MARKETING_PAUSED_STATUS,
] as const;

export function marketingDashboardStatuses(
  includePaused = false,
  includeChurned = false,
): string[] {
  const statuses: string[] = [MARKETING_ACTIVE_STATUS];
  if (includePaused) {
    statuses.push(MARKETING_PAUSED_STATUS);
  }
  if (includeChurned) {
    statuses.push(MARKETING_CHURNED_STATUS);
  }
  return statuses;
}

export function isMarketingChurnedClient(
  status: string | null | undefined,
): boolean {
  return status === MARKETING_CHURNED_STATUS;
}

export function isMarketingPausedClient(
  status: string | null | undefined,
): boolean {
  return status === MARKETING_PAUSED_STATUS;
}
