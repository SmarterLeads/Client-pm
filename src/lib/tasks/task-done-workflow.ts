import { isTaskReviewerEmail } from "@/lib/tasks/reviewers";
import type { TeamMember } from "@/lib/types";

export function mergeDoneReviewFields(
  teamMember: Pick<TeamMember, "id" | "email">,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  if (payload.status !== "done") return payload;

  if (isTaskReviewerEmail(teamMember.email)) {
    return {
      ...payload,
      reviewed_by: teamMember.id,
      reviewed_at: new Date().toISOString(),
    };
  }

  return {
    ...payload,
    reviewed_by: null,
    reviewed_at: null,
  };
}

export function isTransitionToDone(
  previousStatus: string | null | undefined,
  nextStatus: string | null | undefined,
): boolean {
  return nextStatus === "done" && previousStatus !== "done";
}
