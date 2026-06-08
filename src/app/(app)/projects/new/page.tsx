import Link from "next/link";
import { ProjectForm } from "@/components/projects/project-form";
import {
  getClientsForSelect,
  getTeamMembersForSelect,
} from "@/lib/queries/projects";
import { getActiveTemplatesForSelect } from "@/lib/queries/templates";

type NewProjectPageProps = {
  searchParams: Promise<{ clientId?: string }>;
};

export default async function NewProjectPage({
  searchParams,
}: NewProjectPageProps) {
  const { clientId } = await searchParams;
  const [clients, teamMembers, templates] = await Promise.all([
    getClientsForSelect(),
    getTeamMembersForSelect(),
    getActiveTemplatesForSelect(),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href={clientId ? `/clients/${clientId}?tab=projects` : "/projects"}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        â† Back
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New project</h1>
        <p className="text-sm text-muted-foreground">
          Create a project with default board sections or apply a template.
        </p>
      </div>

      <ProjectForm
        clients={clients}
        teamMembers={teamMembers}
        templates={templates}
        defaultClientId={clientId}
      />
    </div>
  );
}
