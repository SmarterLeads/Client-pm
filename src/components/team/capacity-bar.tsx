import {
  capacityBarClasses,
  getCapacityLevel,
  getCapacityPercent,
} from "@/lib/team/capacity";

type CapacityBarProps = {
  estimatedHoursRemaining: number;
  capacityHours: number;
  compact?: boolean;
};

export function CapacityBar({
  estimatedHoursRemaining,
  capacityHours,
  compact = false,
}: CapacityBarProps) {
  const level = getCapacityLevel(estimatedHoursRemaining, capacityHours);
  const pct = getCapacityPercent(estimatedHoursRemaining, capacityHours);

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <div
        className={`flex items-center justify-between text-muted-foreground ${compact ? "text-[10px]" : "text-xs"}`}
      >
        <span>Capacity</span>
        <span>
          {estimatedHoursRemaining}h / {capacityHours}h ({pct}%)
        </span>
      </div>
      <div
        className={`overflow-hidden rounded-full bg-muted ${compact ? "h-1.5" : "h-2"}`}
      >
        <div
          className={`h-full rounded-full transition-all ${capacityBarClasses[level]}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}
