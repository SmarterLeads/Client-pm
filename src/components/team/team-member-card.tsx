"use client";

import { AgencyBadge } from "@/components/team/agency-badge";
import { AvailabilityToggle } from "@/components/team/availability-toggle";
import { CapacityBar } from "@/components/team/capacity-bar";
import { RoleBadge } from "@/components/team/role-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { TeamWorkloadMember } from "@/lib/team/types";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type TeamMemberCardProps = {
  member: TeamWorkloadMember;
  canManage: boolean;
  availabilityPending: boolean;
  onOpen: () => void;
  onReassign: () => void;
  onToggleAvailability: (isAvailable: boolean) => void;
};

export function TeamMemberCard({
  member,
  canManage,
  availabilityPending,
  onOpen,
  onReassign,
  onToggleAvailability,
}: TeamMemberCardProps) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 flex-col gap-4 p-4 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex items-start gap-3">
          <Avatar size="lg">
            {member.avatar_url ? (
              <AvatarImage src={member.avatar_url} alt="" />
            ) : null}
            <AvatarFallback>{initials(member.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{member.name}</h3>
              <RoleBadge role={member.role} />
              <AgencyBadge name={member.agency_name} />
            </div>
            <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
              <span>{member.open_tasks} open</span>
              <span
                className={cn(
                  member.overdue_tasks > 0 && "font-medium text-destructive",
                )}
              >
                {member.overdue_tasks} overdue
              </span>
            </div>
          </div>
        </div>

        <CapacityBar
          estimatedHoursRemaining={member.estimated_hours_remaining}
          capacityHours={member.capacity_hours}
        />
      </button>

      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
        <AvailabilityToggle
          isAvailable={member.is_available}
          interactive={canManage}
          disabled={availabilityPending}
          onToggle={onToggleAvailability}
        />

        {canManage ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onReassign();
            }}
          >
            Reassign tasks
          </Button>
        ) : null}
      </div>
    </div>
  );
}
