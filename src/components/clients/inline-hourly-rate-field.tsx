"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { formatHourlyRate } from "@/lib/clients/hourly-billing";
import type { ClientCurrency } from "@/lib/clients/overview-fields";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";

type InlineHourlyRateFieldProps = {
  rate: number | null;
  onSave: (rate: number | null) => Promise<{ error?: string }>;
  "aria-label": string;
  className?: string;
  currency?: ClientCurrency;
};

export function InlineHourlyRateField({
  rate,
  onSave,
  "aria-label": ariaLabel,
  className,
  currency = "CAD",
}: InlineHourlyRateFieldProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(rate != null ? String(rate) : "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!editing) {
      setDraft(rate != null ? String(rate) : "");
    }
  }, [rate, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function beginEdit() {
    setDraft(rate != null ? String(rate) : "");
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(rate != null ? String(rate) : "");
    setError(null);
    setEditing(false);
  }

  function commitEdit() {
    const trimmed = draft.trim();
    const nextRate =
      trimmed === "" ? null : Number.parseFloat(trimmed);

    if (trimmed !== "" && Number.isNaN(nextRate)) {
      setError("Enter a valid dollar amount.");
      return;
    }

    const currentRate = rate ?? null;
    if (nextRate === currentRate) {
      setEditing(false);
      return;
    }

    startTransition(async () => {
      const result = await onSave(nextRate);
      if (result.error) {
        setError(result.error);
        toastError(result.error);
        setDraft(rate != null ? String(rate) : "");
        return;
      }
      toastSuccess("Client updated");
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className={cn("flex flex-col items-end gap-1", className)}>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            ref={inputRef}
            type="number"
            min={0}
            step="0.01"
            value={draft}
            disabled={isPending}
            aria-label={ariaLabel}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitEdit();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                cancelEdit();
              }
            }}
            className="h-8 w-32 pl-6 text-sm font-medium"
          />
        </div>
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  const displayRate = rate ?? 0;

  return (
    <button
      type="button"
      data-inline-edit-trigger="true"
      onClick={beginEdit}
      className={cn(
        "rounded-md px-1 py-0.5 text-sm font-medium transition hover:bg-muted/60",
        !rate && "text-muted-foreground",
        className,
      )}
      aria-label={`Edit ${ariaLabel}`}
    >
      {formatHourlyRate(displayRate, currency)}
    </button>
  );
}
