import Link from "next/link";
import { CapacityBar } from "@/components/team/capacity-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardTeamWorkloadRow } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

export function DashboardTeamWorkload({
  members,
}: {
  members: DashboardTeamWorkloadRow[];
}) {
  if (members.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        No team members to display.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {members.map((member) => (
        <li key={member.id} className="space-y-3 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium">{member.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {member.open_tasks} open
                <span
                  className={cn(
                    member.overdue_tasks > 0 &&
                      "font-medium text-destructive",
                  )}
                >
                  {" · "}
                  {member.overdue_tasks} overdue
                </span>
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                member.is_available
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {member.is_available ? "Available" : "Away"}
            </span>
          </div>
          <CapacityBar
            estimatedHoursRemaining={member.estimated_hours_remaining}
            capacityHours={member.capacity_hours}
          />
        </li>
      ))}
    </ul>
  );
}

export function DashboardTeamWorkloadPanel({
  members,
}: {
  members: DashboardTeamWorkloadRow[];
}) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>Team workload</CardTitle>
        <Link
          href="/team"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        <DashboardTeamWorkload members={members} />
      </CardContent>
    </Card>
  );
}
