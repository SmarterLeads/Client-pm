"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { PmEnumValues } from "@/lib/types/enums";
import type { ClientSelectOption } from "@/lib/interactions/types";

const interactionTypes = PmEnumValues.interaction_type;

type InteractionsFiltersProps = {
  clients: ClientSelectOption[];
};

export function InteractionsFilters({ clients }: InteractionsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const type = searchParams.get("type") ?? "";
  const client = searchParams.get("client") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }

    startTransition(() => {
      router.replace(`/interactions?${params.toString()}`);
    });
  }

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center ${isPending ? "opacity-70" : ""}`}
    >
      <Input
        type="search"
        placeholder="Search summary…"
        defaultValue={q}
        className="w-full sm:max-w-xs"
        onChange={(e) => updateParams({ q: e.target.value })}
      />
      <select
        value={type}
        onChange={(e) => updateParams({ type: e.target.value })}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm sm:w-40 dark:bg-input/30"
        aria-label="Filter by type"
      >
        <option value="">All types</option>
        {interactionTypes.map((t) => (
          <option key={t} value={t}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </option>
        ))}
      </select>
      <select
        value={client}
        onChange={(e) => updateParams({ client: e.target.value })}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm sm:w-44 dark:bg-input/30"
        aria-label="Filter by client"
      >
        <option value="">All clients</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={from}
        onChange={(e) => updateParams({ from: e.target.value })}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm sm:w-40 dark:bg-input/30"
        aria-label="From date"
      />
      <input
        type="date"
        value={to}
        onChange={(e) => updateParams({ to: e.target.value })}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm sm:w-40 dark:bg-input/30"
        aria-label="To date"
      />
    </div>
  );
}
