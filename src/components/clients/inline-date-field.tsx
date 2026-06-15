"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { formatProjectDueDate, isoDateInputValue } from "@/lib/projects/field-options";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";

type InlineDateFieldProps = {
  value: string | null;
  onSave: (value: string | null) => Promise<{ error?: string }>;
  "aria-label": string;
  className?: string;
  emptyLabel?: string;
  successMessage?: string;
};

export function InlineDateField({
  value,
  onSave,
  "aria-label": ariaLabel,
  className,
  emptyLabel = "No due date",
  successMessage = "Updated",
}: InlineDateFieldProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(isoDateInputValue(value));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!editing) setDraft(isoDateInputValue(value));
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function beginEdit() {
    setDraft(isoDateInputValue(value));
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(isoDateInputValue(value));
    setError(null);
    setEditing(false);
  }

  function commitEdit() {
    const nextValue = draft.trim() || null;
    const currentValue = isoDateInputValue(value) || null;

    if (nextValue === currentValue) {
      setEditing(false);
      return;
    }

    startTransition(async () => {
      const result = await onSave(nextValue);
      if (result.error) {
        setError(result.error);
        toastError(result.error);
        setDraft(isoDateInputValue(value));
        return;
      }
      toastSuccess(successMessage);
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <span className={cn("inline-flex flex-col gap-1", className)}>
        <Input
          ref={inputRef}
          type="date"
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
          className="h-7 w-[9.5rem] px-2 text-sm font-medium"
        />
        {error ? (
          <span className="text-xs text-destructive" role="alert">
            {error}
          </span>
        ) : null}
      </span>
    );
  }

  const label = formatProjectDueDate(value);

  return (
    <button
      type="button"
      data-inline-edit-trigger="true"
      onClick={beginEdit}
      className={cn(
        "rounded-md px-1 py-0.5 text-sm font-medium transition hover:bg-muted/60",
        !label && "text-muted-foreground",
        className,
      )}
      aria-label={`Edit ${ariaLabel}`}
    >
      {label ?? emptyLabel}
    </button>
  );
}
