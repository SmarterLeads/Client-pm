"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AgencyBadge } from "@/components/team/agency-badge";
import { AvailabilityToggle } from "@/components/team/availability-toggle";
import { RoleBadge } from "@/components/team/role-badge";
import { InviteTeamMemberSheet } from "@/components/settings/invite-team-member-sheet";
import { TeamMemberNameEditor } from "@/components/settings/team-member-name-editor";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  setTeamMemberActive,
  updateTeamMemberRole,
} from "@/lib/actions/settings";
import type { AgencyListRow } from "@/lib/queries/agencies";
import type { TeamMemberSettingsRow } from "@/lib/queries/settings";
import { PmEnumValues } from "@/lib/types/enums";
import { toastError, toastSuccess } from "@/lib/toast";

const roles = PmEnumValues.team_member_role;

type TeamSettingsTableProps = {
  members: TeamMemberSettingsRow[];
  agencies: AgencyListRow[];
  isAdmin: boolean;
};

export function TeamSettingsTable({
  members,
  agencies,
  isAdmin,
}: TeamSettingsTableProps) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggleActive(member: TeamMemberSettingsRow) {
    setPendingId(member.id);
    startTransition(async () => {
      const result = await setTeamMemberActive(member.id, !member.is_active);
      setPendingId(null);
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess(
        member.is_active ? "Team member deactivated" : "Team member activated",
      );
      router.refresh();
    });
  }

  function handleRoleChange(memberId: string, role: string) {
    setPendingId(memberId);
    startTransition(async () => {
      const result = await updateTeamMemberRole(memberId, role);
      setPendingId(null);
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Role updated");
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {members.length} team member{members.length === 1 ? "" : "s"}
        </p>
        {isAdmin ? (
          <Button type="button" onClick={() => setInviteOpen(true)}>
            Invite team member
          </Button>
        ) : null}
      </div>

      {members.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          No team members yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Agency</TableHead>
                {isAdmin ? <TableHead className="text-right">Status</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow
                  key={member.id}
                  className={member.is_active ? undefined : "opacity-60"}
                >
                  <TableCell className="font-medium">
                    <TeamMemberNameEditor
                      memberId={member.id}
                      name={member.name}
                      editable={isAdmin}
                      onSaved={() => router.refresh()}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.email}
                  </TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <select
                        value={member.role}
                        disabled={isPending && pendingId === member.id}
                        onChange={(event) =>
                          handleRoleChange(member.id, event.target.value)
                        }
                        className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {role.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <RoleBadge role={member.role} />
                    )}
                  </TableCell>
                  <TableCell>
                    <AvailabilityToggle
                      isAvailable={member.is_available}
                      interactive={false}
                    />
                  </TableCell>
                  <TableCell>
                    <AgencyBadge name={member.agency_name} />
                  </TableCell>
                  {isAdmin ? (
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant={member.is_active ? "outline" : "default"}
                        disabled={isPending && pendingId === member.id}
                        onClick={() => handleToggleActive(member)}
                      >
                        {member.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {isAdmin ? (
        <InviteTeamMemberSheet
          agencies={agencies}
          open={inviteOpen}
          onOpenChange={setInviteOpen}
        />
      ) : null}
    </>
  );
}
