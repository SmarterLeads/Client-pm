import Link from "next/link";
import { notFound } from "next/navigation";
import { TemplateEditor } from "@/components/templates/template-editor";
import { isAdmin } from "@/lib/auth/roles";
import { getTeamMember } from "@/lib/auth/session";
import { getTeamMembersForSelect } from "@/lib/queries/projects";
import { getTemplateById } from "@/lib/queries/templates";

type TemplateDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TemplateDetailPage({
  params,
}: TemplateDetailPageProps) {
  const { id } = await params;
  const teamMember = await getTeamMember();
  if (!teamMember) {
    notFound();
  }

  const [detail, teamMembers] = await Promise.all([
    getTemplateById(id),
    getTeamMembersForSelect(),
  ]);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings/templates"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Templates
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Edit template
        </h1>
      </div>

      <TemplateEditor
        detail={detail}
        teamMembers={teamMembers}
        isAdmin={isAdmin(teamMember.role)}
      />
    </div>
  );
}
