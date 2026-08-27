import { isAdmin } from "@/lib/auth/roles";
import { isTaskReviewerEmail } from "@/lib/tasks/reviewers";
import type { TeamMember } from "@/lib/types";

/** Max and Alex — can create and edit knowledge base content. */
export function isKbEditor(email: string | null | undefined): boolean {
  return isTaskReviewerEmail(email);
}

export function canManageKnowledgeBase(
  teamMember: Pick<TeamMember, "email" | "role"> | null | undefined,
): boolean {
  if (!teamMember) return false;
  return isKbEditor(teamMember.email) || isAdmin(teamMember.role);
}
