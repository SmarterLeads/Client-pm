import Link from "next/link";
import { PortalInteractionList } from "@/components/portal/portal-interaction-list";
import { ProjectStatusBadge } from "@/components/clients/project-status-badge";
import { RagDot } from "@/components/clients/rag-dot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPortalSession } from "@/lib/auth/session";
import {
  getPortalActiveProjects,
  getPortalRecentInteractions,
  getPortalUpcomingMilestones,
} from "@/lib/queries/portal";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function PortalDashboardPage() {
  const session = await getPortalSession();
  if (!session) return null;

  const { clientUser, client } = session;
  const displayName = clientUser.name ?? clientUser.email.split("@")[0];

  const [projects, milestones, interactions] = await Promise.all([
    getPortalActiveProjects(),
    getPortalUpcomingMilestones(),
    getPortalRecentInteractions(5),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {displayName}
        </h1>
        <p className="text-sm text-muted-foreground">{client.name}</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Active projects</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active projects.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/portal/projects/${project.id}`}
                className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium">{project.name}</h3>
                  <RagDot status={project.rag_status} />
                </div>
                <div className="mt-3">
                  <ProjectStatusBadge status={project.status} />
                </div>
                {project.due_date ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Due {formatDate(project.due_date)}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming milestones</CardTitle>
          </CardHeader>
          <CardContent>
            {milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No milestones in the next 30 days.
              </p>
            ) : (
              <ul className="space-y-3">
                {milestones.map((milestone) => (
                  <li
                    key={milestone.id}
                    className="rounded-lg border border-border px-3 py-2"
                  >
                    <p className="font-medium">{milestone.title}</p>
                    <p className="text-sm text-muted-foreground">
                      <Link
                        href={`/portal/projects/${milestone.project_id}`}
                        className="hover:underline"
                      >
                        {milestone.project_name}
                      </Link>
                      {" · "}
                      {formatDate(milestone.target_date)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent interactions</CardTitle>
          </CardHeader>
          <CardContent>
            <PortalInteractionList interactions={interactions} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
