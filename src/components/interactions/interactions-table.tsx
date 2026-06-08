import Link from "next/link";
import { InteractionTypeIcon } from "@/components/interactions/interaction-type-icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  channelLabels,
  formatInteractionDateTime,
  interactionTypeLabels,
} from "@/lib/interactions/display";
import type { GlobalInteractionRow } from "@/lib/interactions/types";
import { Badge } from "@/components/ui/badge";

export function InteractionsTable({
  interactions,
}: {
  interactions: GlobalInteractionRow[];
}) {
  if (interactions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        No interactions match your filters.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Client</TableHead>
            <TableHead className="hidden md:table-cell">Contact</TableHead>
            <TableHead className="hidden sm:table-cell">Channel</TableHead>
            <TableHead>Summary</TableHead>
            <TableHead className="hidden lg:table-cell">Logged by</TableHead>
            <TableHead>Occurred</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {interactions.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <span
                  className="flex size-8 items-center justify-center rounded-full border border-border bg-muted/40"
                  title={interactionTypeLabels[item.type]}
                >
                  <InteractionTypeIcon
                    type={item.type}
                    className="text-muted-foreground"
                  />
                </span>
              </TableCell>
              <TableCell>
                <Link
                  href={`/clients/${item.client_id}?tab=interactions`}
                  className="font-medium hover:underline"
                >
                  {item.client_name}
                </Link>
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {item.contact_name ?? "—"}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {item.channel ? (
                  <Badge variant="secondary">{channelLabels[item.channel]}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <span className="font-medium">{item.summary}</span>
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {item.logged_by_name ?? "—"}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                <time dateTime={item.occurred_at}>
                  {formatInteractionDateTime(item.occurred_at)}
                </time>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
