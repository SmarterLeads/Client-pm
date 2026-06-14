import type { TeamMember } from "@/lib/types";

const BUSINESS_DASHBOARD_OWNER_EMAIL = "max@smarterleads.ca";

export function canViewBusinessDashboard(
  teamMember: Pick<TeamMember, "email" | "can_view_mrr">,
): boolean {
  return (
    teamMember.can_view_mrr ||
    teamMember.email.toLowerCase() === BUSINESS_DASHBOARD_OWNER_EMAIL
  );
}

export function canViewMonthlyFinancials(
  teamMember: Pick<TeamMember, "email">,
): boolean {
  return teamMember.email.toLowerCase() === BUSINESS_DASHBOARD_OWNER_EMAIL;
}
