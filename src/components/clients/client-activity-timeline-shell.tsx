"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { ClientActivityTimeline } from "@/components/clients/client-activity-timeline";
import { Button } from "@/components/ui/button";
import { loadMoreClientActivity } from "@/lib/actions/client-activity";
import type {
  ActivityEvent,
  ClientActivityLogFilters,
} from "@/lib/clients/activity-log";

type ClientActivityTimelineShellProps = {
  clientId: string;
  initialEvents: ActivityEvent[];
  initialHasMore: boolean;
  filters: ClientActivityLogFilters;
  hasActiveFilters: boolean;
  clientPath: string;
};

export function ClientActivityTimelineShell({
  clientId,
  initialEvents,
  initialHasMore,
  filters,
  hasActiveFilters,
  clientPath,
}: ClientActivityTimelineShellProps) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setEvents(initialEvents);
    setHasMore(initialHasMore);
    setPage(0);
  }, [initialEvents, initialHasMore]);

  function handleLoadMore() {
    startTransition(async () => {
      const nextPage = page + 1;
      const result = await loadMoreClientActivity(clientId, filters, nextPage);
      setEvents((current) => [...current, ...result.entries]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    });
  }

  return (
    <div className="space-y-4">
      <ClientActivityTimeline
        events={events}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => router.replace(`${clientPath}?tab=history`)}
      />

      {hasMore ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={handleLoadMore}
            disabled={isPending}
          >
            {isPending ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
