import Link from "next/link";
import { RagDot } from "@/components/clients/rag-dot";
import { formatInteractionDate } from "@/components/clients/last-contacted-indicator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DashboardClientHealthRow } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

export function DashboardClientHealthTable({
  clients,
}: {
  clients: DashboardClientHealthRow[];
}) {
  if (clients.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        No clients to display.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">RAG</TableHead>
            <TableHead>Client</TableHead>
            <TableHead className="hidden md:table-cell">
              Account manager
            </TableHead>
            <TableHead className="hidden sm:table-cell text-right">
              Active projects
            </TableHead>
            <TableHead className="text-right">Overdue tasks</TableHead>
            <TableHead className="hidden lg:table-cell">
              Last interaction
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell>
                <RagDot status={client.rag_status} />
              </TableCell>
              <TableCell>
                <Link
                  href={`/clients/${client.id}`}
                  className="font-medium hover:underline"
                >
                  {client.name}
                </Link>
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {client.account_manager ?? "—"}
              </TableCell>
              <TableCell className="hidden text-right sm:table-cell">
                {client.active_projects}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums",
                  client.overdue_tasks > 0 &&
                    "font-medium text-destructive",
                )}
              >
                {client.overdue_tasks}
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {formatInteractionDate(client.last_interaction_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
