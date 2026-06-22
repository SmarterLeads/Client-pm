"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { CLIENT_STATUSES } from "@/lib/pm/constants";
import type { AgencyListRow } from "@/lib/queries/agencies";
import { PmEnumValues } from "@/lib/types/enums";

const statuses = CLIENT_STATUSES;
const ragStatuses = PmEnumValues.rag_status;

type ClientsFiltersProps = {
  agencies: AgencyListRow[];
};

export function ClientsFilters({ agencies }: ClientsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const [isPending, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const rag = searchParams.get("rag") ?? "";
  const agency =
    searchParams.get("agency_id") ?? searchParams.get("agency") ?? "";
  const includeInactive = searchParams.get("include_inactive") === "true";

  function updateParams(updates: Record<string, string | boolean>) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("agency");

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
      router.replace(`/clients?${params.toString()}`);
    });
  }

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center ${isPending ? "opacity-70" : ""}`}
    >
      <Input
        type="search"
        placeholder="Search by name…"
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
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </option>
        ))}
      </select>
      <select
        value={rag}
        onChange={(e) => updateParams({ rag: e.target.value })}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm sm:w-40 dark:bg-input/30"
        aria-label="Filter by RAG"
      >
        <option value="">All RAG</option>
        {ragStatuses.map((r) => (
          <option key={r} value={r}>
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </option>
        ))}
      </select>
      <select
        value={agency}
        onChange={(e) => updateParams({ agency_id: e.target.value })}
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
      <label className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-input px-3 text-sm">
        <input
          type="checkbox"
          checked={includeInactive}
          onChange={(e) =>
            updateParams({ include_inactive: e.target.checked })
          }
          className="size-4 rounded border-input"
        />
        <span>Include inactive</span>
      </label>
    </div>
  );
}
