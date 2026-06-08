import { cn } from "@/lib/utils";

export type ContactHealth = "green" | "amber" | "red" | "none";

export function getContactHealth(
  lastInteractionAt: string | null,
): ContactHealth {
  if (!lastInteractionAt) return "none";

  const days =
    (Date.now() - new Date(lastInteractionAt).getTime()) / (1000 * 60 * 60 * 24);

  if (days < 14) return "green";
  if (days <= 30) return "amber";
  return "red";
}

const healthStyles: Record<ContactHealth, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  none: "bg-muted",
};

const healthLabels: Record<ContactHealth, string> = {
  green: "Contacted within 14 days",
  amber: "Last contact 14—30 days ago",
  red: "No contact in over 30 days",
  none: "No interactions logged",
};

export function LastContactedIndicator({
  lastInteractionAt,
  showLabel = true,
}: {
  lastInteractionAt: string | null;
  showLabel?: boolean;
}) {
  const health = getContactHealth(lastInteractionAt);

  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span
        className={cn("size-2.5 shrink-0 rounded-full", healthStyles[health])}
        aria-hidden
      />
      {showLabel ? (
        <span className="text-muted-foreground">
          {lastInteractionAt
            ? `${formatDate(lastInteractionAt)} · ${healthLabels[health]}`
            : healthLabels.none}
        </span>
      ) : (
        <span className="sr-only">{healthLabels[health]}</span>
      )}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatInteractionDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
