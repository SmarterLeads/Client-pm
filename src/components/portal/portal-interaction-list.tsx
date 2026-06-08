import { InteractionTypeIcon } from "@/components/interactions/interaction-type-icon";
import { formatInteractionDateTime } from "@/lib/interactions/display";
import type { InteractionRow } from "@/lib/interactions/types";

export function PortalInteractionList({
  interactions,
}: {
  interactions: InteractionRow[];
}) {
  if (interactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No recent interactions.</p>
    );
  }

  return (
    <ol className="space-y-3">
      {interactions.map((item) => (
        <li
          key={item.id}
          className="flex gap-3 rounded-lg border border-border bg-card p-3"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40">
            <InteractionTypeIcon
              type={item.type}
              className="text-muted-foreground"
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{item.summary}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your team · {formatInteractionDateTime(item.occurred_at)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
