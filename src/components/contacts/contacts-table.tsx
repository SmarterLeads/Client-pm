"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatContactName } from "@/lib/clients/contact-utils";
import type { ContactListRow } from "@/lib/queries/contacts";

type ContactsTableProps = {
  contacts: ContactListRow[];
  onEdit: (contact: ContactListRow) => void;
  onDelete: (contact: ContactListRow) => void;
};

function clientContactHref(clientId: string, contactId: string) {
  return `/clients/${clientId}?tab=overview#contact-${contactId}`;
}

export function ContactsTable({ contacts, onEdit, onDelete }: ContactsTableProps) {
  if (contacts.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        No contacts match your filters.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Email</TableHead>
            <TableHead className="hidden lg:table-cell">Phone</TableHead>
            <TableHead className="hidden lg:table-cell">Job title</TableHead>
            <TableHead>Client</TableHead>
            <TableHead className="hidden md:table-cell">Agency</TableHead>
            <TableHead className="w-[100px]">Primary</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow key={contact.id}>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={clientContactHref(contact.client_id, contact.id)}
                    className="font-medium hover:underline"
                  >
                    {formatContactName(contact)}
                  </Link>
                </div>
                <div className="mt-1 space-y-0.5 md:hidden">
                  {contact.email ? (
                    <a
                      href={`mailto:${contact.email}`}
                      className="block text-xs text-muted-foreground hover:underline"
                    >
                      {contact.email}
                    </a>
                  ) : null}
                  {contact.phone ? (
                    <p className="text-xs text-muted-foreground">{contact.phone}</p>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {contact.email ? (
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-sm hover:underline"
                  >
                    {contact.email}
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {contact.phone ?? "—"}
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {contact.job_title ?? "—"}
              </TableCell>
              <TableCell>
                <Link
                  href={`/clients/${contact.client_id}`}
                  className="text-sm hover:underline"
                >
                  {contact.client_name}
                </Link>
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {contact.agency_name ?? "—"}
              </TableCell>
              <TableCell>
                {contact.is_primary ? (
                  <Badge variant="secondary">Primary</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(contact)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(contact)}
                  >
                    Delete
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    render={
                      <Link
                        href={clientContactHref(contact.client_id, contact.id)}
                      />
                    }
                  >
                    View client
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
