"use client";

import { useState, useTransition } from "react";
import { ContactFormSheet } from "@/components/clients/contact-form-sheet";
import { DeleteContactDialog } from "@/components/clients/delete-contact-dialog";
import { AddContactSheet } from "@/components/contacts/add-contact-sheet";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { Button } from "@/components/ui/button";
import { loadMoreContacts } from "@/lib/actions/contacts";
import type { ContactListRow } from "@/lib/queries/contacts";
import type { SelectOption } from "@/lib/queries/projects";
import type { ClientContact } from "@/lib/types";
import type { ContactListFilters } from "@/lib/validations/contact";
import { toastError } from "@/lib/toast";

type ContactsListProps = {
  initialContacts: ContactListRow[];
  initialNextCursor: string | null;
  filters: ContactListFilters;
  clients: SelectOption[];
};

function toClientContact(row: ContactListRow): ClientContact {
  return {
    id: row.id,
    client_id: row.client_id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    job_title: row.job_title,
    is_primary: row.is_primary,
    is_active: true,
    name: null,
    pm_notes: null,
    created_at: "",
    updated_at: "",
  };
}

export function ContactsList({
  initialContacts,
  initialNextCursor,
  filters,
  clients,
}: ContactsListProps) {
  const [contacts, setContacts] = useState(initialContacts);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactListRow | null>(
    null,
  );
  const [deletingContact, setDeletingContact] = useState<ContactListRow | null>(
    null,
  );

  function handleLoadMore() {
    if (!nextCursor) return;

    startTransition(async () => {
      try {
        const page = await loadMoreContacts(filters, nextCursor);
        setContacts((current) => [...current, ...page.contacts]);
        setNextCursor(page.nextCursor);
      } catch (err) {
        toastError(
          err instanceof Error ? err.message : "Failed to load more contacts.",
        );
      }
    });
  }

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" onClick={() => setAddOpen(true)}>
          Add contact
        </Button>
      </div>

      <div className="space-y-4">
        <ContactsTable
          contacts={contacts}
          onEdit={(contact) => setEditingContact(contact)}
          onDelete={(contact) => setDeletingContact(contact)}
        />
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

      <AddContactSheet
        clients={clients}
        open={addOpen}
        onOpenChange={setAddOpen}
      />

      {editingContact ? (
        <ContactFormSheet
          clientId={editingContact.client_id}
          contact={toClientContact(editingContact)}
          open={editingContact !== null}
          onOpenChange={(open) => {
            if (!open) setEditingContact(null);
          }}
        />
      ) : null}

      <DeleteContactDialog
        contact={deletingContact}
        open={deletingContact !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingContact(null);
        }}
      />
    </>
  );
}
