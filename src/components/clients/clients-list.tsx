"use client";

import { useState, useTransition } from "react";
import { ClientsTable } from "@/components/clients/clients-table";
import { Button } from "@/components/ui/button";
import { loadMoreClients } from "@/lib/actions/clients";
import type { ClientListFilters, ClientListRow } from "@/lib/queries/clients";
import { toastError } from "@/lib/toast";

type ClientsListProps = {
  initialClients: ClientListRow[];
  initialNextCursor: string | null;
  filters: ClientListFilters;
};

export function ClientsList({
  initialClients,
  initialNextCursor,
  filters,
}: ClientsListProps) {
  const [clients, setClients] = useState(initialClients);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isPending, startTransition] = useTransition();

  function handleLoadMore() {
    if (!nextCursor) return;

    startTransition(async () => {
      try {
        const page = await loadMoreClients(filters, nextCursor);
        setClients((current) => [...current, ...page.clients]);
        setNextCursor(page.nextCursor);
      } catch (err) {
        toastError(
          err instanceof Error ? err.message : "Failed to load more clients.",
        );
      }
    });
  }

  return (
    <div className="space-y-4">
      <ClientsTable clients={clients} />
      {nextCursor ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={handleLoadMore}
          >
            {isPending ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
