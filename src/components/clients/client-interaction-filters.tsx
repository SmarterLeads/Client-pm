"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { interactionTypeOptions } from "@/lib/interactions/display";

export function ClientInteractionFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const type = searchParams.get("type") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "interactions");

    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
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
        {interactionTypeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
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
