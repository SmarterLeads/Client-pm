"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SelectOption } from "@/lib/queries/projects";

type ClientSearchSelectProps = {
  clients: SelectOption[];
  defaultClientId?: string;
  error?: string;
};

export function ClientSearchSelect({
  clients,
  defaultClientId = "",
  error,
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
      <Label htmlFor="client_search">
        Client<span className="text-destructive"> *</span>
      </Label>
      <Input
        id="client_search"
        list="client-options"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          const match = clients.find(
            (c) => c.name.toLowerCase() === e.target.value.trim().toLowerCase(),
          );
          setSelectedId(match?.id ?? "");
        }}
        placeholder="Search clients…"
        className="mt-1.5"
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
