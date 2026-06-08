import Link from "next/link";
import { InternalProjectForm } from "@/components/internal/internal-project-form";
import { getTeamMembersForInternalSelect } from "@/lib/queries/internal";

export default async function NewInternalProjectPage() {
  const teamMembers = await getTeamMembersForInternalSelect();

  return (
    <div className="space-y-6">
      <Link
        href="/internal/projects"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          New internal project
        </h1>
        <p className="text-sm text-muted-foreground">
          Create an internal project for team work.
        </p>
      </div>

      <InternalProjectForm teamMembers={teamMembers} />
    </div>
  );
}
