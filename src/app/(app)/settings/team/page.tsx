import Link from "next/link";
import { redirect } from "next/navigation";
import { TeamSettingsTable } from "@/components/settings/team-settings-table";
import { isAdmin } from "@/lib/auth/roles";
import { getTeamMember } from "@/lib/auth/session";
import { getAgenciesList } from "@/lib/queries/agencies";
import { getTeamMembersForSettings } from "@/lib/queries/settings";

export default async function SettingsTeamPage() {
  const teamMember = await getTeamMember();
  if (!teamMember) {
    redirect("/login");
  }

  const [members, agencies] = await Promise.all([
    getTeamMembersForSettings(),
    getAgenciesList(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Settings
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Team settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage team members, roles, and access.
        </p>
      </div>

      <TeamSettingsTable
        members={members}
        agencies={agencies}
        isAdmin={isAdmin(teamMember.role)}
      />
    </div>
  );
}
