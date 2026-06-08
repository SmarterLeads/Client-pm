"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useDashboardDateRange } from "@/contexts/dashboard-date-range-context";
import type { DashboardComparisonMode } from "@/lib/queries/lead-gen-query-keys";

const OPTIONS: Array<{ id: DashboardComparisonMode; label: string }> = [
  { id: "prior_period", label: "vs Prior Period" },
  { id: "prior_year", label: "vs Prior Year" },
];

const headerBtnClass =
  "inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50";

export function DashboardComparisonDropdown() {
  const { comparison, setComparison } = useDashboardDateRange();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const activeLabel = OPTIONS.find((o) => o.id === comparison)?.label ?? "vs Prior Period";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={headerBtnClass}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="whitespace-nowrap">{activeLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
      </button>

      {open ? (
        <div
          className="absolute right-0 z-50 mt-2 min-w-[10.5rem] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          role="listbox"
        >
          {OPTIONS.map((opt) => {
            const active = comparison === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setComparison(opt.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                  active
                    ? "font-semibold text-zinc-900 dark:text-zinc-50"
                    : "text-zinc-700 dark:text-zinc-300"
                }`}
              >
                <span>{opt.label}</span>
                {active ? <span className="text-zinc-500">✓</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
