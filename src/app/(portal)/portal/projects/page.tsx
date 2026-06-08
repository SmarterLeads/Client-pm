import Link from "next/link";
import { ProjectStatusBadge } from "@/components/clients/project-status-badge";
import { RagDot } from "@/components/clients/rag-dot";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPortalProjectsList } from "@/lib/queries/portal";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function PortalProjectsPage() {
  const projects = await getPortalProjectsList();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-sm text-muted-foreground">
          {projects.length} project{projects.length === 1 ? "" : "s"}
        </p>
      </div>

      {projects.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          No projects available.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>RAG</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead className="text-right">Milestones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <Link
                      href={`/portal/projects/${project.id}`}
                      className="font-medium hover:underline"
                    >
                      {project.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <ProjectStatusBadge status={project.status} />
                  </TableCell>
                  <TableCell>
                    <RagDot status={project.rag_status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(project.due_date)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {project.completed_milestones}/{project.total_milestones}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
