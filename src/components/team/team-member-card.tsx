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
    <div className="flex flex-col rounded-lg border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 flex-col gap-2.5 p-3 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex items-start gap-2.5">
          <Avatar size="sm">
            {member.avatar_url ? (
              <AvatarImage src={member.avatar_url} alt="" />
            ) : null}
            <AvatarFallback className="text-[10px]">
              {initials(member.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="truncate text-sm font-semibold">{member.name}</h3>
              <RoleBadge role={member.role} compact />
            </div>
            <div className="mt-1">
              <AgencyBadge name={member.agency_name} compact />
            </div>
            <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
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
          compact
        />
      </button>

      <div className="flex items-center justify-between gap-2 border-t border-border px-2.5 py-2">
        <AvailabilityToggle
          isAvailable={member.is_available}
          interactive={canManage}
          disabled={availabilityPending}
          compact
          onToggle={onToggleAvailability}
        />

        {canManage ? (
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onReassign();
            }}
          >
            Reassign
          </Button>
        ) : null}
      </div>
    </div>
  );
}
