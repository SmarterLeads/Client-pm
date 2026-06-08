"use client";

import { MoreHorizontal } from "lucide-react";
import { useState, useTransition } from "react";
import { archiveClient, deleteClient } from "@/lib/actions/clients";
import { normalizeOverviewStatus } from "@/lib/clients/overview-fields";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toastError } from "@/lib/toast";

type ClientActionsMenuProps = {
  clientId: string;
  status: string | null | undefined;
  isAdmin: boolean;
};

export function ClientActionsMenu({
  clientId,
  status,
  isAdmin,
}: ClientActionsMenuProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const normalized = normalizeOverviewStatus(status);
  const isInactive = normalized === "on_hold" || normalized === "churned";

  function handleArchive(nextStatus: "active" | "on_hold" | "churned") {
    startTransition(async () => {
      const result = await archiveClient(clientId, nextStatus);
      if (result?.error) {
        toastError(result.error);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteClient(clientId);
      if (result?.error) {
        toastError(result.error);
        return;
      }
      setDeleteOpen(false);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex size-8 items-center justify-center rounded-lg border border-input bg-background text-sm shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
          aria-label="Client actions"
          disabled={isPending}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {normalized !== "on_hold" ? (
            <DropdownMenuItem onClick={() => handleArchive("on_hold")}>
              Mark as Paused
            </DropdownMenuItem>
          ) : null}
          {normalized !== "churned" ? (
            <DropdownMenuItem onClick={() => handleArchive("churned")}>
              Mark as Churned
            </DropdownMenuItem>
          ) : null}
          {isInactive ? (
            <DropdownMenuItem onClick={() => handleArchive("active")}>
              Reactivate
            </DropdownMenuItem>
          ) : null}
          {isAdmin ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                Delete client
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={deleteOpen} onOpenChange={setDeleteOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Delete client</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              This will permanently delete the client and all associated
              projects, tasks, contacts, and interactions. This cannot be undone.
            </p>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={handleDelete}
              >
                {isPending ? "Deleting…" : "Delete permanently"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setDeleteOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
