"use client";

import { useRouter } from "next/navigation";
import { ClientActivityTimeline } from "@/components/clients/client-activity-timeline";
import type { ActivityEvent } from "@/lib/clients/activity-log";

type ClientActivityTimelineShellProps = {
  events: ActivityEvent[];
  hasActiveFilters: boolean;
  clientPath: string;
};

export function ClientActivityTimelineShell({
  events,
  hasActiveFilters,
  clientPath,
}: ClientActivityTimelineShellProps) {
  const router = useRouter();

  return (
    <ClientActivityTimeline
      events={events}
      hasActiveFilters={hasActiveFilters}
      onClearFilters={() => router.replace(`${clientPath}?tab=history`)}
    />
  );
}
