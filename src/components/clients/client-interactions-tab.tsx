"use client";

import { Suspense, useState, useTransition } from "react";
import { ClientInteractionFilters } from "@/components/clients/client-interaction-filters";
import { LogInteractionSheet } from "@/components/clients/log-interaction-sheet";
import { InteractionTimeline } from "@/components/interactions/interaction-timeline";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteInteraction } from "@/lib/actions/clients";
import type { InteractionRow } from "@/lib/interactions/types";
import { toastError, toastSuccess } from "@/lib/toast";
import type { ClientContact } from "@/lib/types";
import { useRouter } from "next/navigation";

type ClientInteractionsTabProps = {
  clientId: string;
  contacts: ClientContact[];
  interactions: InteractionRow[];
  currentTeamMemberId: string | null;
  isAdmin: boolean;
};

export function ClientInteractionsTab({
  clientId,
  contacts,
  interactions,
  currentTeamMemberId,
  isAdmin,
}: ClientInteractionsTabProps) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingInteraction, setEditingInteraction] =
    useState<InteractionRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function openCreateSheet() {
    setEditingInteraction(null);
    setSheetOpen(true);
  }

  function openEditSheet(interaction: InteractionRow) {
    setEditingInteraction(interaction);
    setSheetOpen(true);
  }

  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open);
    if (!open) {
      setEditingInteraction(null);
    }
  }

  async function handleDelete(interaction: InteractionRow) {
    const confirmed = window.confirm(
      "Delete this interaction? This cannot be undone.",
    );
    if (!confirmed) return;

    setDeletingId(interaction.id);
    const result = await deleteInteraction(clientId, interaction.id);
    setDeletingId(null);

    if (result.error) {
      toastError(result.error);
      return;
    }

    toastSuccess("Interaction deleted");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Suspense fallback={<FiltersSkeleton />}>
          <ClientInteractionFilters />
        </Suspense>
        <Button type="button" onClick={openCreateSheet} className="shrink-0">
          Log interaction
        </Button>
      </div>

      {interactions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          No interactions logged yet.
        </p>
      ) : (
        <InteractionTimeline
          interactions={interactions}
          currentTeamMemberId={currentTeamMemberId}
          isAdmin={isAdmin}
          deletingId={deletingId}
          onEdit={openEditSheet}
          onDelete={handleDelete}
        />
      )}

      <LogInteractionSheet
        clientId={clientId}
        contacts={contacts}
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        interaction={editingInteraction}
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
