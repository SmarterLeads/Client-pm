"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AgencyListRow } from "@/lib/queries/agencies";
import type { SelectOption } from "@/lib/queries/projects";

type ContactsFiltersProps = {
  agencies: AgencyListRow[];
  clients: SelectOption[];
};

export function ContactsFilters({ agencies, clients }: ContactsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const [isPending, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const agency = searchParams.get("agency") ?? "";
  const client = searchParams.get("client") ?? "";
  const primary = searchParams.get("primary") === "true";

  function updateParams(updates: Record<string, string | boolean>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value === true) {
        params.set(key, "true");
      } else if (typeof value === "string" && value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    startTransition(() => {
      router.replace(`/contacts?${params.toString()}`);
    });
  }

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end ${isPending ? "opacity-70" : ""}`}
    >
      <div className="w-full sm:max-w-xs">
        <Input
          type="search"
          placeholder="Search name, email, job title…"
          defaultValue={q}
          onChange={(e) => updateParams({ q: e.target.value })}
          aria-label="Search contacts"
        />
      </div>
      <select
        value={agency}
        onChange={(e) => updateParams({ agency: e.target.value })}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm sm:w-44 dark:bg-input/30"
        aria-label="Filter by agency"
      >
        <option value="">All agencies</option>
        {agencies.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
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
      <label className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-input px-3 text-sm">
        <input
          type="checkbox"
          checked={primary}
          onChange={(e) => updateParams({ primary: e.target.checked })}
          className="size-4 rounded border-input"
        />
        <span>Primary only</span>
      </label>
    </div>
  );
}
