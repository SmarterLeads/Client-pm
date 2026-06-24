"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TeamMemberCard } from "@/components/team/team-member-card";
import { TeamMemberDrawer } from "@/components/team/team-member-drawer";
import { setTeamMemberAvailability } from "@/lib/actions/team";
import { toastError, toastSuccess } from "@/lib/toast";
import type {
  MemberTasksByProject,
  TeamWorkloadMember,
} from "@/lib/team/types";

type TeamWorkloadGridProps = {
  members: TeamWorkloadMember[];
  tasksByMember: Record<string, MemberTasksByProject[]>;
  reassignTargets: { id: string; name: string }[];
  canManage: boolean;
};

export function TeamWorkloadGrid({
  members,
  tasksByMember,
  reassignTargets,
  canManage,
}: TeamWorkloadGridProps) {
  const router = useRouter();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [reassignMode, setReassignMode] = useState(false);
  const [availabilityPendingId, setAvailabilityPendingId] = useState<
    string | null
  >(null);
  const [, startTransition] = useTransition();

  const selectedMember =
    members.find((m) => m.id === selectedMemberId) ?? null;

  function openMember(memberId: string, reassign = false) {
    setSelectedMemberId(memberId);
    setReassignMode(reassign);
  }

  function closeDrawer() {
    setSelectedMemberId(null);
    setReassignMode(false);
  }

  function handleToggleAvailability(memberId: string, isAvailable: boolean) {
    setAvailabilityPendingId(memberId);
    startTransition(async () => {
      const result = await setTeamMemberAvailability(memberId, isAvailable);
      setAvailabilityPendingId(null);
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Availability updated");
      router.refresh();
    });
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {members.map((member) => (
          <TeamMemberCard
            key={member.id}
            member={member}
            canManage={canManage}
            availabilityPending={availabilityPendingId === member.id}
            onOpen={() => openMember(member.id, false)}
            onReassign={() => openMember(member.id, true)}
            onToggleAvailability={(isAvailable) =>
              handleToggleAvailability(member.id, isAvailable)
            }
          />
        ))}
      </div>

      <TeamMemberDrawer
        member={selectedMember}
        tasksByProject={
          selectedMember ? (tasksByMember[selectedMember.id] ?? []) : []
        }
        reassignTargets={reassignTargets}
        reassignMode={reassignMode}
        canManage={canManage}
        onClose={closeDrawer}
        onReassignComplete={() => router.refresh()}
      />
    </>
  );
}
