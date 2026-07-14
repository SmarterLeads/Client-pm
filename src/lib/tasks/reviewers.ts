import type { TeamMember } from "@/lib/types";

export const TASK_REVIEWER_EMAILS = new Set([
  "max@smarterleads.ca",
  "alex@smarterleads.ca",
]);

export function isTaskReviewerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return TASK_REVIEWER_EMAILS.has(email.trim().toLowerCase());
}

/** Max and Alex — can see and use the task review queue. */
export function canReviewTasks(
  teamMember: Pick<TeamMember, "email"> | null | undefined,
): boolean {
  return isTaskReviewerEmail(teamMember?.email);
}
