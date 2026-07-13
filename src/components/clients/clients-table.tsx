import Link from "next/link";
import { ClientStatusDot } from "@/components/clients/client-status-dot";
import { RagDot } from "@/components/clients/rag-dot";
import { StatusBadge } from "@/components/clients/status-badge";
import { Badge } from "@/components/ui/badge";
import { formatInteractionDate } from "@/components/clients/last-contacted-indicator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClientListRow } from "@/lib/queries/clients";

export function ClientsTable({ clients }: { clients: ClientListRow[] }) {
  if (clients.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        No clients match your filters.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden lg:table-cell">Agency</TableHead>
            <TableHead className="hidden md:table-cell">Primary contact</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>RAG</TableHead>
            <TableHead className="hidden md:table-cell">Account manager</TableHead>
            <TableHead className="hidden sm:table-cell text-right">
              Active projects
            </TableHead>
            <TableHead className="hidden lg:table-cell">Last interaction</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => {
            const isChurned = client.status === "churned";

            return (
              <TableRow
                key={client.id}
                className={isChurned ? "bg-muted/40 text-muted-foreground" : undefined}
              >
              <TableCell>
                <div className="flex items-center gap-2">
                  <ClientStatusDot status={client.status} />
                  <Link
                    href={`/clients/${client.id}`}
                    className={`font-medium hover:underline ${isChurned ? "text-muted-foreground" : ""}`}
                  >
                    {client.name}
                  </Link>
                  {isChurned ? (
                    <Badge variant="destructive" className="text-xs">
                      Churned
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {client.agency_name ?? "—"}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="text-sm">
                  {client.primary_contact ?? "—"}
                  {client.primary_contact_email ? (
                    <p className="text-xs text-muted-foreground">
                      {client.primary_contact_email}
                    </p>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge status={client.status} />
              </TableCell>
              <TableCell>
                <RagDot status={client.rag_status} />
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {client.account_manager ?? "—"}
              </TableCell>
              <TableCell className="hidden text-right sm:table-cell">
                {client.active_projects}
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {formatInteractionDate(client.last_interaction_at)}
              </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
