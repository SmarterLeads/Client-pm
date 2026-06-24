"use client";

import { cn } from "@/lib/utils";

type AvailabilityToggleProps = {
  isAvailable: boolean;
  interactive: boolean;
  disabled?: boolean;
  compact?: boolean;
  onToggle?: (isAvailable: boolean) => void;
};

export function AvailabilityToggle({
  isAvailable,
  interactive,
  disabled = false,
  compact = false,
  onToggle,
}: AvailabilityToggleProps) {
  const label = isAvailable ? "Available" : "Unavailable";

  if (!interactive) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}
      >
        <span
          className={cn(
            "size-2.5 shrink-0 rounded-full",
            isAvailable ? "bg-emerald-500" : "bg-red-500",
          )}
          aria-hidden
        />
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onToggle?.(!isAvailable);
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border font-medium transition-colors",
        compact ? "px-2 py-0.5 text-xs" : "gap-2 px-2.5 py-1 text-sm",
        "disabled:pointer-events-none disabled:opacity-50",
        isAvailable
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
          : "border-red-200 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
      )}
      aria-pressed={isAvailable}
      aria-label={`${label}. Click to toggle.`}
    >
      <span
        className={cn(
          "size-2.5 shrink-0 rounded-full",
          isAvailable ? "bg-emerald-500" : "bg-red-500",
        )}
        aria-hidden
      />
      {label}
    </button>
  );
}
