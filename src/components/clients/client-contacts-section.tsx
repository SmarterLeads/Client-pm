"use client";

import { useEffect, useState } from "react";
import { ContactFormSheet } from "@/components/clients/contact-form-sheet";
import { DeleteContactDialog } from "@/components/clients/delete-contact-dialog";
import { formatContactName } from "@/lib/clients/contact-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientContact } from "@/lib/types";

type ClientContactsSectionProps = {
  clientId: string;
  contacts: ClientContact[];
};

export function ClientContactsSection({
  clientId,
  contacts,
}: ClientContactsSectionProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(
    null,
  );
  const [deletingContact, setDeletingContact] = useState<ClientContact | null>(
    null,
  );

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#contact-")) return;
    const id = hash.slice(1);
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [contacts]);

  return (
    <>
      <Card id="client-contacts-section">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Contacts</CardTitle>
          <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
            Add contact
          </Button>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No contacts yet. Add one to get started.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {contacts.map((contact) => (
                <li
                  key={contact.id}
                  id={`contact-${contact.id}`}
                  className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between scroll-mt-24"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {formatContactName(contact)}
                      </span>
                      {contact.is_primary ? (
                        <Badge variant="secondary">Primary</Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {[contact.job_title, contact.email, contact.phone]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingContact(contact)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeletingContact(contact)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ContactFormSheet
        clientId={clientId}
        open={addOpen}
        onOpenChange={setAddOpen}
      />

      <ContactFormSheet
        clientId={clientId}
        contact={editingContact}
        open={editingContact !== null}
        onOpenChange={(open) => {
          if (!open) setEditingContact(null);
        }}
      />

      <DeleteContactDialog
        contact={deletingContact}
        otherContacts={contacts.filter((row) => row.id !== deletingContact?.id)}
        open={deletingContact !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingContact(null);
        }}
      />
    </>
  );
}
