import { isTaskReviewerEmail } from "@/lib/tasks/reviewers";
import type { TeamMember } from "@/lib/types";

export function mergeDoneReviewFields(
  teamMember: Pick<TeamMember, "id" | "email">,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  if (normalizeTaskStatus(String(payload.status ?? "")) !== "done") return payload;

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

export function normalizeTaskStatus(
  status: string | null | undefined,
): string | null | undefined {
  if (status === "completed") return "done";
  return status;
}

export function isTransitionToDone(
  previousStatus: string | null | undefined,
  nextStatus: string | null | undefined,
): boolean {
  const normalizedNext = normalizeTaskStatus(nextStatus);
  const normalizedPrevious = normalizeTaskStatus(previousStatus);
  return normalizedNext === "done" && normalizedPrevious !== "done";
}
