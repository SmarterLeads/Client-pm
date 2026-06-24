import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TeamActivityFilters } from "@/components/team/team-activity-filters";
import { TeamActivityReport } from "@/components/team/team-activity-report";
import { TeamWorkloadGrid } from "@/components/team/team-workload-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { canManageTeam } from "@/lib/auth/roles";
import {
  canViewTeamActivityReport,
  getTeamMember,
} from "@/lib/auth/session";
import { getTeamActivityReport } from "@/lib/queries/team-activity";
import {
  getAllMemberOpenTasksByProject,
  getTeamMembersForReassign,
  getTeamWorkloadMembers,
} from "@/lib/queries/team";
import {
  isValidIsoDate,
  parseTeamActivityRangePreset,
} from "@/lib/team/activity-date-range";

const roleLabels: Record<
  "admin" | "manager" | "member" | "agency_contact",
  string
> = {
  admin: "Admin",
  manager: "Manager",
  member: "Member",
  agency_contact: "Agency contact",
};

type TeamPageProps = {
  searchParams: Promise<{
    ta_member?: string;
    ta_range?: string;
    ta_from?: string;
    ta_to?: string;
  }>;
};

function ActivityFiltersSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <Skeleton className="h-8 w-full max-w-xs" />
      <Skeleton className="h-8 w-full max-w-xs" />
    </div>
  );
}

export default async function TeamPage({ searchParams }: TeamPageProps) {
  const currentMember = await getTeamMember();
  if (!currentMember) {
    redirect("/login");
  }

  const params = await searchParams;
  const showActivityReport = canViewTeamActivityReport(currentMember);

  const [members, tasksByMember, reassignTargets] = await Promise.all([
    getTeamWorkloadMembers(),
    getAllMemberOpenTasksByProject(),
    getTeamMembersForReassign(),
  ]);

  const canManage = canManageTeam(currentMember.role);

  const activityRange = parseTeamActivityRangePreset(params.ta_range);
  const activityFrom = isValidIsoDate(params.ta_from) ? params.ta_from : undefined;
  const activityTo = isValidIsoDate(params.ta_to) ? params.ta_to : undefined;
  const activityMemberId = params.ta_member?.trim() || undefined;

  const activityReport = showActivityReport
    ? await getTeamActivityReport(
        members.map((member) => ({ id: member.id, name: member.name })),
        {
          preset: activityRange,
          from: activityFrom,
          to: activityTo,
        },
        activityMemberId,
      )
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team workload</h1>
        <p className="text-sm text-muted-foreground">
          Capacity, open tasks, and reassignment for your team
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Signed in as {roleLabels[currentMember.role as keyof typeof roleLabels] ?? currentMember.role}
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

      {showActivityReport ? (
        <section className="space-y-4 border-t border-border pt-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Team Activity Report
            </h2>
            <p className="text-sm text-muted-foreground">
              Task changes, interactions, and client updates by team member
            </p>
          </div>

          <Suspense fallback={<ActivityFiltersSkeleton />}>
            <TeamActivityFilters teamMembers={members} />
          </Suspense>

          {activityReport ? <TeamActivityReport report={activityReport} /> : null}
        </section>
      ) : null}
    </div>
  );
}
