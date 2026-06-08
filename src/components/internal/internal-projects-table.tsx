import Link from "next/link";
import { ProjectStatusBadge } from "@/components/clients/project-status-badge";
import { RagDot } from "@/components/clients/rag-dot";
import { TaskProgressBar } from "@/components/clients/task-progress-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InternalProjectListRow } from "@/lib/queries/internal";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function InternalProjectsTable({
  projects,
}: {
  projects: InternalProjectListRow[];
}) {
  if (projects.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        No internal projects match your filters.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>RAG</TableHead>
            <TableHead className="hidden sm:table-cell">Owner</TableHead>
            <TableHead className="hidden lg:table-cell">Due date</TableHead>
            <TableHead className="hidden md:table-cell">Progress</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id}>
              <TableCell>
                <Link
                  href={`/internal/projects/${project.id}`}
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
              <TableCell className="hidden text-muted-foreground sm:table-cell">
                {project.owner_name ?? "—"}
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {formatDate(project.due_date)}
              </TableCell>
              <TableCell className="hidden md:table-cell">
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
  );
}
