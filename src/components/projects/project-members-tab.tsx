"use client";

import { useRouter } from "next/navigation";
import { useActionState, useTransition } from "react";
import {
  addProjectMember,
  removeProjectMember,
  type ProjectFormState,
} from "@/lib/actions/projects";
import { useActionToast } from "@/hooks/use-action-toast";
import { toastError, toastSuccess } from "@/lib/toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ProjectMemberRow } from "@/lib/queries/projects";
import type { TeamMember } from "@/lib/types";
import { PmEnumValues } from "@/lib/types/enums";

const initialState: ProjectFormState = {};
const roles = PmEnumValues.project_member_role;

type ProjectMembersTabProps = {
  projectId: string;
  members: ProjectMemberRow[];
  teamMembers: Pick<TeamMember, "id" | "name" | "email">[];
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProjectMembersTab({
  projectId,
  members,
  teamMembers,
}: ProjectMembersTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const boundAction = addProjectMember.bind(null, projectId);
  const [formState, formAction, pending] = useActionState(
    boundAction,
    initialState,
  );

  const memberIds = new Set(members.map((m) => m.team_member_id));
  const available = teamMembers.filter((t) => !memberIds.has(t.id));

  useActionToast(formState, {
    successMessage: "Member added",
    onSuccess: () => router.refresh(),
  });

  function handleRemove(memberId: string) {
    startTransition(async () => {
      const result = await removeProjectMember(projectId, memberId);
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Member removed");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form
        action={formAction}
        className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-end"
      >
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Label htmlFor="team_member_id">Team member</Label>
            <select
              id="team_member_id"
              name="team_member_id"
              required
              defaultValue=""
              className="mt-1.5 h-8 w-full rounded-lg border border-input px-2.5 text-sm dark:bg-input/30"
            >
              <option value="" disabled>
                Select member
              </option>
              {available.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:w-40">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              name="role"
              defaultValue="contributor"
              className="mt-1.5 h-8 w-full rounded-lg border border-input px-2.5 text-sm dark:bg-input/30"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button type="submit" disabled={pending || available.length === 0}>
          {pending ? "Adding…" : "Add member"}
        </Button>
      </form>

      {formState.error ? (
        <p className="text-sm text-destructive">{formState.error}</p>
      ) : null}

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No members yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Avatar size="sm">
                  {member.team_member.avatar_url ? (
                    <AvatarImage
                      src={member.team_member.avatar_url}
                      alt=""
                    />
                  ) : null}
                  <AvatarFallback>
                    {initials(member.team_member.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{member.team_member.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {member.team_member.email}
                  </p>
                </div>
                <Badge variant="secondary">
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => handleRemove(member.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
