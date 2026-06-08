import { redirect } from "next/navigation";
import { TeamWorkloadGrid } from "@/components/team/team-workload-grid";
import { getTeamMember } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/auth/roles";
import {
  getAllMemberOpenTasksByProject,
  getTeamMembersForReassign,
  getTeamWorkloadMembers,
} from "@/lib/queries/team";

const roleLabels: Record<
  "admin" | "manager" | "member" | "agency_contact",
  string
> = {
  admin: "Admin",
  manager: "Manager",
  member: "Member",
  agency_contact: "Agency contact",
};

export default async function TeamPage() {
  const currentMember = await getTeamMember();
  if (!currentMember) {
    redirect("/login");
  }

  const [members, tasksByMember, reassignTargets] = await Promise.all([
    getTeamWorkloadMembers(),
    getAllMemberOpenTasksByProject(),
    getTeamMembersForReassign(),
  ]);

  const canManage = canManageTeam(currentMember.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team workload</h1>
        <p className="text-sm text-muted-foreground">
          Capacity, open tasks, and reassignment for your team
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Signed in as {roleLabels[currentMember.role]}
          {!canManage
            ? " — set your role to Admin or Manager in Supabase (team_members) to manage availability and reassign tasks."
            : null}
        </p>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active team members.</p>
      ) : (
        <TeamWorkloadGrid
          members={members}
          tasksByMember={tasksByMember}
          reassignTargets={reassignTargets}
          canManage={canManage}
        />
      )}
    </div>
  );
}
