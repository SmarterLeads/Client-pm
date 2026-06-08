"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { PmEnumValues } from "@/lib/types/enums";
import type { SelectOption } from "@/lib/queries/projects";

const statuses = PmEnumValues.project_status;

type ProjectsFiltersProps = {
  clients: SelectOption[];
  owners: SelectOption[];
};

export function ProjectsFilters({ clients, owners }: ProjectsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const client = searchParams.get("client") ?? "";
  const owner = searchParams.get("owner") ?? "";

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }

    startTransition(() => {
      router.replace(`/projects?${params.toString()}`);
    });
  }

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center ${isPending ? "opacity-70" : ""}`}
    >
      <Input
        type="search"
        placeholder="Search by project name…"
        defaultValue={q}
        className="w-full sm:max-w-xs"
        onChange={(e) => updateParams({ q: e.target.value })}
      />
      <select
        value={status}
        onChange={(e) => updateParams({ status: e.target.value })}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm sm:w-40 dark:bg-input/30"
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        {statuses.map((s) => (
          <option key={s} value={s}>
            {s.replace("_", " ").replace(/^\w/, (m) => m.toUpperCase())}
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
      <select
        value={owner}
        onChange={(e) => updateParams({ owner: e.target.value })}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm sm:w-44 dark:bg-input/30"
        aria-label="Filter by owner"
      >
        <option value="">All owners</option>
        {owners.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}
