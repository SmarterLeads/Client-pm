import { Badge } from "@/components/ui/badge";
import {
  actionBadgeClass,
  formatAbsoluteTime,
  formatChangeValue,
  formatFieldLabel,
  formatRelativeTime,
  getChangeDiffs,
} from "@/lib/change-history/display";
import type { ChangeHistoryRow } from "@/lib/change-history/types";
import { cn } from "@/lib/utils";

type ChangeHistoryTimelineProps = {
  entries: ChangeHistoryRow[];
  showEntity?: boolean;
};

function formatEntityType(entityType: string) {
  return entityType.replace(/_/g, " ");
}

export function ChangeHistoryTimeline({
  entries,
  showEntity = false,
}: ChangeHistoryTimelineProps) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        No history yet
      </p>
    );
  }

  return (
    <ol className="relative space-y-0 border-l border-border pl-6">
      {entries.map((entry) => {
        const diffs = getChangeDiffs(
          entry.action,
          entry.old_values,
          entry.new_values,
        );

        return (
          <li key={entry.id} className="relative pb-6 last:pb-0">
            <span className="absolute -left-[0.4rem] top-2 size-2 rounded-full bg-primary" />
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "capitalize",
                      actionBadgeClass[entry.action as keyof typeof actionBadgeClass],
                    )}
                  >
                    {entry.action}
                  </Badge>
                  {showEntity ? (
                    <span className="text-sm text-muted-foreground">
                      {formatEntityType(entry.entity_type)}
                    </span>
                  ) : null}
                </div>
                <time
                  dateTime={entry.changed_at}
                  title={formatAbsoluteTime(entry.changed_at)}
                  className="cursor-default text-xs text-muted-foreground"
                >
                  {formatRelativeTime(entry.changed_at)}
                </time>
              </div>

              <p className="mt-2 text-sm">
                <span className="font-medium">
                  {entry.changed_by_name ?? "System"}
                </span>
                {!showEntity ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · {formatEntityType(entry.entity_type)}
                  </span>
                ) : null}
              </p>

              {entry.action === "insert" && entry.new_values ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Record created
                </p>
              ) : null}

              {entry.action === "delete" ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Record deleted
                </p>
              ) : null}

              {diffs.length > 0 ? (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {diffs.map((diff) => (
                    <li
                      key={diff.field}
                      className="rounded-md bg-muted/40 px-3 py-2 text-muted-foreground"
                    >
                      <span className="font-medium text-foreground">
                        {formatFieldLabel(diff.field)}:
                      </span>{" "}
                      {formatChangeValue(diff.oldValue)} â†’{" "}
                      {formatChangeValue(diff.newValue)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
