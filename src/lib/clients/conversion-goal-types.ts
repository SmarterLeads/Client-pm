export const CONVERSION_GOAL_TYPES = [
  "lead",
  "appointment",
  "call",
  "chat",
  "purchase",
  "other",
] as const;

export type ConversionGoalType = (typeof CONVERSION_GOAL_TYPES)[number];

export function inferConversionGoalType(input: {
  conversion_name?: string | null;
  conversion_id?: string | null;
  conversion_type?: string | null;
}): ConversionGoalType {
  const explicit = input.conversion_type?.trim().toLowerCase();
  if (
    explicit &&
    (CONVERSION_GOAL_TYPES as readonly string[]).includes(explicit)
  ) {
    return explicit as ConversionGoalType;
  }

  const name = input.conversion_name?.trim().toLowerCase() ?? "";
  const id = input.conversion_id?.trim().toLowerCase() ?? "";
  if (name.includes("purchase") || id === "purchase") {
    return "purchase";
  }

  return "lead";
}
