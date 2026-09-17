export function mergeDoneReviewFields(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  if (normalizeTaskStatus(String(payload.status ?? "")) !== "done") {
    return payload;
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
