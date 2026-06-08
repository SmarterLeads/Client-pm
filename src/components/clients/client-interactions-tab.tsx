"use client";

import { Suspense, useState } from "react";
import { ClientInteractionFilters } from "@/components/clients/client-interaction-filters";
import { LogInteractionSheet } from "@/components/clients/log-interaction-sheet";
import { InteractionTimeline } from "@/components/interactions/interaction-timeline";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { InteractionRow } from "@/lib/interactions/types";
import type { ClientContact } from "@/lib/types";

type ClientInteractionsTabProps = {
  clientId: string;
  contacts: ClientContact[];
  interactions: InteractionRow[];
};

export function ClientInteractionsTab({
  clientId,
  contacts,
  interactions,
}: ClientInteractionsTabProps) {
  const [logOpen, setLogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Suspense fallback={<FiltersSkeleton />}>
          <ClientInteractionFilters />
        </Suspense>
        <Button type="button" onClick={() => setLogOpen(true)} className="shrink-0">
          Log interaction
        </Button>
      </div>

      {interactions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          No interactions logged yet.
        </p>
      ) : (
        <InteractionTimeline interactions={interactions} />
      )}

      <LogInteractionSheet
        clientId={clientId}
        contacts={contacts}
        open={logOpen}
        onOpenChange={setLogOpen}
      />
    </div>
  );
}

function FiltersSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-8 w-40" />
    </div>
  );
}
