import Link from "next/link";
import { ProjectStatusBadge } from "@/components/clients/project-status-badge";
import { RagDot } from "@/components/clients/rag-dot";
import { TaskProgressBar } from "@/components/clients/task-progress-bar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClientProjectRow } from "@/lib/queries/clients";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ClientProjectsTab({
  clientId,
  projects,
}: {
  clientId: string;
  projects: ClientProjectRow[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button render={<Link href={`/projects/new?clientId=${clientId}`} />}>
          New project
        </Button>
      </div>

      {projects.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          No projects for this client yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>RAG</TableHead>
                <TableHead className="hidden md:table-cell">Owner</TableHead>
                <TableHead className="hidden sm:table-cell">Due date</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <Link
                      href={`/projects/${project.id}`}
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
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {project.owner_name ?? "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {formatDate(project.due_date)}
                  </TableCell>
                  <TableCell>
                    <TaskProgressBar
                      done={project.done_tasks}
                      total={project.total_tasks}
                    />
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
