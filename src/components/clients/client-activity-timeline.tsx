"use client";

import {
  ActivityCategoryIcon,
  activityCategoryMeta,
} from "@/components/clients/client-activity-display";
import {
  formatAbsoluteTime,
  formatChangeValue,
  formatFieldLabel,
  formatRelativeTime,
} from "@/lib/change-history/display";
import type { ActivityEvent } from "@/lib/clients/activity-log";
import { cn } from "@/lib/utils";

type ClientActivityTimelineProps = {
  events: ActivityEvent[];
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
};

export function ClientActivityTimeline({
  events,
  onClearFilters,
  hasActiveFilters = false,
}: ClientActivityTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          {hasActiveFilters
            ? "No activity matches your filters."
            : "No activity yet for this client."}
        </p>
        {hasActiveFilters && onClearFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <ol className="relative space-y-0 border-l border-border pl-6">
      {events.map((event) => {
        const meta = activityCategoryMeta[event.category];

        return (
          <li key={event.id} className="relative pb-6 last:pb-0">
            <span
              className={cn(
                "absolute -left-[0.4rem] top-3 size-2.5 rounded-full ring-2 ring-background",
                meta.dotClass,
              )}
            />
            <article
              className={cn(
                "rounded-lg border p-4 shadow-sm",
                meta.accentClass,
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <ActivityCategoryIcon
                    category={event.category}
                    className="mt-0.5 text-muted-foreground"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {event.title}
                    </p>
                    {event.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {event.description}
                      </p>
                    ) : null}
                  </div>
                </div>
                <time
                  dateTime={event.timestamp}
                  title={formatAbsoluteTime(event.timestamp)}
                  className="shrink-0 cursor-default text-xs text-muted-foreground"
                >
                  {formatRelativeTime(event.timestamp)}
                </time>
              </div>

              <p className="mt-2 text-sm text-muted-foreground">
                {event.actorName ?? "System"}
              </p>

              {event.diffs && event.diffs.length > 0 ? (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {event.diffs.map((diff) => (
                    <li
                      key={diff.field}
                      className="rounded-md bg-background/70 px-3 py-2 text-muted-foreground"
                    >
                      <span className="font-medium text-foreground">
                        {formatFieldLabel(diff.field)}:
                      </span>{" "}
                      {formatChangeValue(diff.oldValue)} →{" "}
                      {formatChangeValue(diff.newValue)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          </li>
        );
      })}
    </ol>
  );
}
