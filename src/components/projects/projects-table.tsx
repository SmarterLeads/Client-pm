import Link from "next/link";
import { ProjectStatusBadge } from "@/components/clients/project-status-badge";
import { RagDot } from "@/components/clients/rag-dot";
import { ProjectMemberAvatars } from "@/components/projects/project-member-avatars";
import { TaskProgressBar } from "@/components/clients/task-progress-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProjectListRow } from "@/lib/queries/projects";

export function ProjectsTable({ projects }: { projects: ProjectListRow[] }) {
  if (projects.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        No projects match your filters.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead className="hidden md:table-cell">Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>RAG</TableHead>
            <TableHead className="hidden sm:table-cell">Team</TableHead>
            <TableHead className="hidden md:table-cell">Progress</TableHead>
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
              <TableCell className="hidden text-muted-foreground md:table-cell">
                <Link
                  href={`/clients/${project.client_id}`}
                  className="hover:underline"
                >
                  {project.client_name}
                </Link>
              </TableCell>
              <TableCell>
                <ProjectStatusBadge status={project.status} />
              </TableCell>
              <TableCell>
                <RagDot status={project.rag_status} />
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <ProjectMemberAvatars
                  members={project.members}
                  emptyLabel="No members"
                />
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
