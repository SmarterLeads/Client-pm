import {
  capacityBarClasses,
  getCapacityLevel,
  getCapacityPercent,
} from "@/lib/team/capacity";

type CapacityBarProps = {
  estimatedHoursRemaining: number;
  capacityHours: number;
};

export function CapacityBar({
  estimatedHoursRemaining,
  capacityHours,
}: CapacityBarProps) {
  const level = getCapacityLevel(estimatedHoursRemaining, capacityHours);
  const pct = getCapacityPercent(estimatedHoursRemaining, capacityHours);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Capacity</span>
        <span>
          {estimatedHoursRemaining}h / {capacityHours}h ({pct}%)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${capacityBarClasses[level]}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}
