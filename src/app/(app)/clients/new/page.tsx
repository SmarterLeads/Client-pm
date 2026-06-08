import Link from "next/link";
import { redirect } from "next/navigation";
import { ClientForm } from "@/components/clients/client-form";
import { getTeamMember } from "@/lib/auth/session";
import { getAgenciesList } from "@/lib/queries/agencies";
import { getActiveTeamMembers } from "@/lib/queries/clients";

export default async function NewClientPage() {
  const teamMember = await getTeamMember();
  if (!teamMember) {
    redirect("/login");
  }

  const [teamMembers, agencies] = await Promise.all([
    getActiveTeamMembers(),
    getAgenciesList(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/clients"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to clients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          New client
        </h1>
        <p className="text-sm text-muted-foreground">
          Add a new client to the CRM.
        </p>
      </div>
      {agencies.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No agencies are available. Create an agency before adding clients.
        </p>
      ) : (
        <ClientForm
          teamMembers={teamMembers}
          agencies={agencies}
          agencyId={teamMember.agency_id}
        />
      )}
    </div>
  );
}
