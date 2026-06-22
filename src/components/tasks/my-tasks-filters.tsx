"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MyTaskClientOption } from "@/lib/queries/tasks";
import type { MyTasksDueDateFilter } from "@/lib/validations/task";

const dueDateOptions: { value: MyTasksDueDateFilter; label: string }[] = [
  { value: "all", label: "All due dates" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "this_week", label: "Due this week" },
  { value: "next_week", label: "Due next week" },
  { value: "no_due_date", label: "No due date" },
];

type MyTasksFiltersProps = {
  clients: MyTaskClientOption[];
  completedCount: number;
};

export function MyTasksFilters({
  clients,
  completedCount,
}: MyTasksFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const [isPending, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const client = searchParams.get("client") ?? "";
  const due = (searchParams.get("due") ?? "all") as MyTasksDueDateFilter;
  const showCompleted = searchParams.get("show_completed") === "true";

  const hasActiveFilters = Boolean(
    q.trim() || client || (due && due !== "all"),
  );

  const selectedClient = clients.find((item) => item.id === client);

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value && value !== "all") params.set(key, value);
      else params.delete(key);
    }

    startTransition(() => {
      const query = params.toString();
      router.replace(query ? `/tasks?${query}` : "/tasks");
    });
  }

  function clearFilters() {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("q");
      params.delete("client");
      params.delete("due");
      const query = params.toString();
      router.replace(query ? `/tasks?${query}` : "/tasks");
    });
  }

  function toggleShowCompleted() {
    updateParams({ show_completed: showCompleted ? "" : "true" });
  }

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center ${isPending ? "opacity-70" : ""}`}
    >
      <div className="relative w-full sm:max-w-xs">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Search by task name…"
          defaultValue={q}
          className="pl-8"
          aria-label="Search by task name"
          onChange={(event) => updateParams({ q: event.target.value })}
        />
      </div>

      <ClientFilterSelect
        clients={clients}
        value={client}
        selectedName={selectedClient?.name ?? ""}
        onChange={(nextClientId) => updateParams({ client: nextClientId })}
      />

      <select
        value={due}
        onChange={(event) => updateParams({ due: event.target.value })}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm sm:w-44 dark:bg-input/30"
        aria-label="Filter by due date"
      >
        {dueDateOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {hasActiveFilters ? (
        <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
          Clear filters
        </Button>
      ) : null}

      <Button
        type="button"
        variant={showCompleted ? "secondary" : "outline"}
        size="sm"
        onClick={toggleShowCompleted}
        className="shrink-0"
      >
        Show completed
        {completedCount > 0 ? ` (${completedCount})` : ""}
      </Button>
    </div>
  );
}

function ClientFilterSelect({
  clients,
  value,
  selectedName,
  onChange,
}: {
  clients: MyTaskClientOption[];
  value: string;
  selectedName: string;
  onChange: (clientId: string) => void;
}) {
  const displayValue = value ? selectedName : "";

  return (
    <div className="relative w-full sm:w-52">
      <Input
        type="search"
        list="my-task-client-options"
        placeholder="Filter by client…"
        defaultValue={displayValue}
        key={`${value}-${selectedName}`}
        className="h-8"
        aria-label="Filter by client"
        onChange={(event) => {
          const nextQuery = event.target.value.trim();
          if (!nextQuery) {
            onChange("");
            return;
          }

          const match = clients.find(
            (item) => item.name.toLowerCase() === nextQuery.toLowerCase(),
          );
          onChange(match?.id ?? value);
        }}
        onBlur={(event) => {
          const nextQuery = event.target.value.trim();
          if (!nextQuery) {
            onChange("");
            return;
          }

          const match = clients.find(
            (item) => item.name.toLowerCase() === nextQuery.toLowerCase(),
          );
          if (!match) {
            event.target.value = displayValue;
          }
        }}
      />
      <datalist id="my-task-client-options">
        {clients.map((item) => (
          <option key={item.id} value={item.name} />
        ))}
      </datalist>
    </div>
  );
}
