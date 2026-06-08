export type CapacityLevel = "green" | "amber" | "red";

export function getCapacityLevel(
  estimatedHoursRemaining: number,
  capacityHours: number,
): CapacityLevel {
  if (capacityHours <= 0) return "green";
  const pct = (estimatedHoursRemaining / capacityHours) * 100;
  if (pct > 100) return "red";
  if (pct >= 80) return "amber";
  return "green";
}

export function getCapacityPercent(
  estimatedHoursRemaining: number,
  capacityHours: number,
): number {
  if (capacityHours <= 0) return 0;
  return Math.min(Math.round((estimatedHoursRemaining / capacityHours) * 100), 150);
}

export const capacityBarClasses: Record<CapacityLevel, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};
