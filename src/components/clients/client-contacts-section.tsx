"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

function sortContacts(contacts: ClientContact[]) {
  return [...contacts].sort((a, b) => {
    if (a.is_primary !== b.is_primary) {
      return a.is_primary ? -1 : 1;
    }
    return formatContactName(a).localeCompare(formatContactName(b));
  });
}

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

  const sortedContacts = useMemo(() => sortContacts(contacts), [contacts]);

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
          {sortedContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No contacts yet. Add one to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium w-24" scope="col" />
                    <th className="pb-2 pr-4 font-medium" scope="col">
                      Name
                    </th>
                    <th className="pb-2 pr-4 font-medium" scope="col">
                      Email
                    </th>
                    <th className="pb-2 pr-4 font-medium" scope="col">
                      Phone
                    </th>
                    <th className="pb-2 pr-4 font-medium" scope="col">
                      Job title
                    </th>
                    <th className="pb-2 font-medium w-28 text-right" scope="col">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedContacts.map((contact) => (
                    <tr
                      key={contact.id}
                      id={`contact-${contact.id}`}
                      className="border-b border-border last:border-0 scroll-mt-24"
                    >
                      <td className="py-3 pr-3 align-middle">
                        {contact.is_primary ? (
                          <Badge variant="secondary">Primary</Badge>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4 align-middle font-medium whitespace-nowrap">
                        {formatContactName(contact)}
                      </td>
                      <td className="py-3 pr-4 align-middle text-muted-foreground">
                        {contact.email ? (
                          <Link
                            href={`mailto:${contact.email}`}
                            className="text-primary hover:underline"
                          >
                            {contact.email}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 pr-4 align-middle text-muted-foreground whitespace-nowrap">
                        {contact.phone ?? "—"}
                      </td>
                      <td className="py-3 pr-4 align-middle text-muted-foreground">
                        {contact.job_title ?? "—"}
                      </td>
                      <td className="py-3 align-middle text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
