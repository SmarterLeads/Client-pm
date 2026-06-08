"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { sheetFieldLabelClassName } from "@/components/ui/sheet-form";
import type { SelectOption } from "@/lib/queries/projects";

type ClientSearchSelectProps = {
  clients: SelectOption[];
  defaultClientId?: string;
  error?: string;
  onClientSelect?: (clientId: string) => void;
};

export function ClientSearchSelect({
  clients,
  defaultClientId = "",
  error,
  onClientSelect,
}: ClientSearchSelectProps) {
  const defaultClient = clients.find((c) => c.id === defaultClientId);
  const [query, setQuery] = useState(defaultClient?.name ?? "");
  const [selectedId, setSelectedId] = useState(defaultClientId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients.slice(0, 20);
    return clients
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 20);
  }, [clients, query]);

  return (
    <div className="relative">
      <label htmlFor="client_search" className={sheetFieldLabelClassName}>
        Client<span className="text-destructive"> *</span>
      </label>
      <Input
        id="client_search"
        list="client-options"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          const match = clients.find(
            (c) => c.name.toLowerCase() === e.target.value.trim().toLowerCase(),
          );
          const nextId = match?.id ?? "";
          setSelectedId(nextId);
          onClientSelect?.(nextId);
        }}
        placeholder="Search clients…"
        className="mt-0 rounded-md px-3 py-2"
        autoComplete="off"
        required
      />
      <datalist id="client-options">
        {filtered.map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>
      <input type="hidden" name="client_id" value={selectedId} required />
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      {!selectedId && query.trim() ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Select a client from the list.
        </p>
      ) : null}
    </div>
  );
}
