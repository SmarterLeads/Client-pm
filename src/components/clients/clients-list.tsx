"use client";

import { ClientsTable } from "@/components/clients/clients-table";
import type { ClientListRow } from "@/lib/queries/clients";

type ClientsListProps = {
  clients: ClientListRow[];
};

export function ClientsList({ clients }: ClientsListProps) {
  return <ClientsTable clients={clients} />;
}
