"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { formatMrr } from "@/lib/clients/overview-fields";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";

type InlineDollarFieldProps = {
  cents: number | null;
  onSave: (cents: number | null) => Promise<{ error?: string }>;
  "aria-label": string;
  className?: string;
};

export function InlineDollarField({
  cents,
  onSave,
  "aria-label": ariaLabel,
  className,
}: InlineDollarFieldProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(cents != null ? String(cents / 100) : "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!editing) {
      setDraft(cents != null ? String(cents / 100) : "");
    }
  }, [cents, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function beginEdit() {
    setDraft(cents != null ? String(cents / 100) : "");
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(cents != null ? String(cents / 100) : "");
    setError(null);
    setEditing(false);
  }

  function commitEdit() {
    const trimmed = draft.trim();
    const nextCents =
      trimmed === ""
        ? null
        : Math.round(Number.parseFloat(trimmed) * 100);

    if (trimmed !== "" && Number.isNaN(nextCents)) {
      setError("Enter a valid dollar amount.");
      return;
    }

    if (nextCents === cents) {
      setEditing(false);
      return;
    }

    startTransition(async () => {
      const result = await onSave(nextCents);
      if (result.error) {
        setError(result.error);
        toastError(result.error);
        setDraft(cents != null ? String(cents / 100) : "");
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

  return (
    <button
      type="button"
      onClick={beginEdit}
      className={cn(
        "rounded-md px-1 py-0.5 text-sm font-medium transition hover:bg-muted/60",
        cents == null && "text-muted-foreground",
        className,
      )}
      aria-label={`Edit ${ariaLabel}`}
    >
      {formatMrr(cents)}
    </button>
  );
}
