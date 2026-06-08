"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  deleteContact,
  getContactsForDeleteDialog,
} from "@/lib/actions/clients";
import { formatContactName } from "@/lib/clients/contact-utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ClientContact } from "@/lib/types";
import { toastError, toastSuccess } from "@/lib/toast";

type DeleteContactTarget = {
  id: string;
  client_id: string;
  first_name: string | null;
  last_name: string | null;
  is_primary: boolean;
};

type SiblingContact = Pick<ClientContact, "id" | "first_name" | "last_name">;

type DeleteContactDialogProps = {
  contact: DeleteContactTarget | null;
  otherContacts?: SiblingContact[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeleteContactDialog({
  contact,
  otherContacts: otherContactsProp,
  open,
  onOpenChange,
}: DeleteContactDialogProps) {
  const router = useRouter();
  const [newPrimaryId, setNewPrimaryId] = useState("");
  const [otherContacts, setOtherContacts] = useState<SiblingContact[]>(
    otherContactsProp ?? [],
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !contact) return;

    if (otherContactsProp?.length) {
      setOtherContacts(
        otherContactsProp.filter((row) => row.id !== contact.id),
      );
      return;
    }

    let cancelled = false;

    void getContactsForDeleteDialog(contact.client_id).then((rows) => {
      if (cancelled) return;
      setOtherContacts(rows.filter((row) => row.id !== contact.id));
    });

    return () => {
      cancelled = true;
    };
  }, [open, contact, otherContactsProp]);

  const needsPrimaryPicker =
    Boolean(contact?.is_primary) && otherContacts.length > 0;

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setNewPrimaryId("");
    }
    onOpenChange(nextOpen);
  }

  function handleDelete() {
    if (!contact) return;

    if (needsPrimaryPicker && !newPrimaryId) {
      toastError("Select a new primary contact before deleting.");
      return;
    }

    startTransition(async () => {
      const result = await deleteContact(
        contact.id,
        needsPrimaryPicker ? newPrimaryId : undefined,
      );

      if (result.error) {
        toastError(result.error);
        return;
      }

      toastSuccess("Contact deleted");
      handleClose(false);
      router.refresh();
    });
  }

  if (!contact) return null;

  const name = formatContactName(contact);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Delete contact</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Delete {name}? This cannot be undone.
          </p>

          {needsPrimaryPicker ? (
            <div>
              <Label htmlFor="new_primary_contact">
                New primary contact
              </Label>
              <select
                id="new_primary_contact"
                value={newPrimaryId}
                onChange={(e) => setNewPrimaryId(e.target.value)}
                className="mt-1.5 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
              >
                <option value="">Select contact…</option>
                {otherContacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {formatContactName(c)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleDelete}
            >
              {isPending ? "Deleting…" : "Delete contact"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => handleClose(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
