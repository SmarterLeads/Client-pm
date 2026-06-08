"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { PmEnumValues } from "@/lib/types/enums";

const interactionTypes = PmEnumValues.interaction_type;

export function PortalInteractionFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const type = searchParams.get("type") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `/portal/interactions?${query}` : "/portal/interactions");
    });
  }

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center ${isPending ? "opacity-70" : ""}`}
    >
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
