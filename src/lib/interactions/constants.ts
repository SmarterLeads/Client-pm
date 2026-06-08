/** Interaction types available in forms and filters. */
export const INTERACTION_TYPES = [
  "meeting",
  "check_in",
  "report",
  "support",
  "quote",
] as const;

export type SelectableInteractionType = (typeof INTERACTION_TYPES)[number];
