"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { leadGenKeys } from "@/lib/queries/lead-gen-query-keys";
import type { PlatformBudgetPacingRow } from "@/lib/queries/lead-gen-queries";
import { createClient } from "@/lib/supabase/client";

function formatUsdFromCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Parse user input like "5000", "5,000", "$5000.50" into whole cents (>= 0). */
export function parseBudgetInputToCents(raw: string): number | null {
  const s = raw.trim().replace(/[$\s]/g, "").replace(/,/g, "");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

type Props = {
  clientId: string;
  platform: string;
  budgetCents: number;
  /** Used to invalidate pacing queries after save */
  totalsPlatformKey: string;
};

export function BudgetPacingBudgetEditor({
  clientId,
  platform,
  budgetCents,
  totalsPlatformKey,
}: Props) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const mutation = useMutation({
    mutationFn: async (cents: number) => {
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth() + 1;
      const p = platform.trim().toLowerCase();
      const row = {
        client_id: clientId,
        platform: p,
        year,
        month,
        budget_amount_cents: cents,
        currency: "USD",
      };
      const { error } = await supabase.from("monthly_budgets").upsert(row, {
        onConflict: "client_id,platform,year,month",
      });
      if (error) throw error;
    },
    onSuccess: async (_void, savedCents) => {
      const pacingKey = leadGenKeys.platformBudgetPacing(clientId, totalsPlatformKey);
      const pNorm = platform.trim().toLowerCase();
      queryClient.setQueryData<PlatformBudgetPacingRow[]>(pacingKey, (old) => {
        if (!old?.length) return old;
        return old.map((row) =>
          row.platform.trim().toLowerCase() === pNorm
            ? { ...row, budgetCents: savedCents }
            : row,
        );
      });
      await queryClient.refetchQueries({ queryKey: pacingKey });
      await queryClient.refetchQueries({
        queryKey: leadGenKeys.spendBudget(clientId),
      });
      setEditing(false);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2200);
    },
  });

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEdit = useCallback(() => {
    setDraft((budgetCents / 100).toFixed(2));
    setEditing(true);
  }, [budgetCents]);

  const cancel = useCallback(() => {
    setEditing(false);
    setDraft("");
  }, []);

  const commit = useCallback(() => {
    const cents = parseBudgetInputToCents(draft);
    if (cents == null) {
      cancel();
      return;
    }
    mutation.mutate(cents);
  }, [draft, mutation, cancel]);

  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Budget
      </p>
      {!editing ? (
        <div className="mt-0.5 flex min-h-[1.25rem] flex-wrap items-center gap-1">
          <span className="text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatUsdFromCents(budgetCents)}
          </span>
          <button
            type="button"
            onClick={startEdit}
            className="shrink-0 rounded p-0.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
            aria-label="Edit budget"
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </button>
          {savedFlash ? (
            <span className="text-emerald-600 dark:text-emerald-400" title="Saved">
              <CheckIcon className="h-4 w-4" />
            </span>
          ) : null}
        </div>
      ) : (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
            disabled={mutation.isPending}
            className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-xs tabular-nums text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            aria-label="Budget amount"
          />
          <button
            type="button"
            onClick={commit}
            disabled={mutation.isPending}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            aria-label="Save budget"
          >
            {mutation.isPending ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <CheckIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      )}
      {mutation.isError ? (
        <p className="mt-1 text-[10px] text-red-600">
          {(mutation.error as Error).message}
        </p>
      ) : null}
    </div>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
    </svg>
  );
}
