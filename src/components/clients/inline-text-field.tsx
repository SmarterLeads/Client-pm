"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";

type InlineTextFieldProps = {
  value: string | null;
  onSave: (value: string | null) => Promise<{ error?: string }>;
  "aria-label": string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  emptyLabel?: string;
  type?: "text" | "url";
  successMessage?: string;
};

function externalUrl(value: string) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function InlineTextField({
  value,
  onSave,
  "aria-label": ariaLabel,
  placeholder,
  className,
  inputClassName,
  emptyLabel = "—",
  type = "text",
  successMessage = "Client updated",
}: InlineTextFieldProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!editing) setDraft(value ?? "");
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function beginEdit() {
    setDraft(value ?? "");
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(value ?? "");
    setError(null);
    setEditing(false);
  }

  function commitEdit() {
    const normalized = draft.trim();
    const nextValue = normalized || null;
    const currentValue = value?.trim() || null;

    if (nextValue === currentValue) {
      setEditing(false);
      return;
    }

    startTransition(async () => {
      const result = await onSave(nextValue);
      if (result.error) {
        setError(result.error);
        toastError(result.error);
        setDraft(value ?? "");
        return;
      }
      toastSuccess(successMessage);
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className={cn("flex flex-col items-end gap-1", className)}>
        <Input
          ref={inputRef}
          type={type}
          value={draft}
          disabled={isPending}
          aria-label={ariaLabel}
          placeholder={placeholder}
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
          className={cn("h-8 text-sm font-medium", inputClassName)}
        />
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  const trimmed = value?.trim();

  if (type === "url") {
    return (
      <div
        className={cn(
          "flex max-w-full items-center justify-end gap-1",
          className,
        )}
      >
        {trimmed ? (
          <a
            href={externalUrl(trimmed)}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-sm font-medium text-primary underline decoration-primary/40 hover:decoration-primary"
          >
            {trimmed}
          </a>
        ) : (
          <button
            type="button"
            data-inline-edit-trigger="true"
            onClick={beginEdit}
            className="rounded-md px-1 py-0.5 text-sm font-medium text-muted-foreground transition hover:bg-muted/60"
            aria-label={`Edit ${ariaLabel}`}
          >
            {emptyLabel}
          </button>
        )}
        <button
          type="button"
          data-inline-edit-trigger="true"
          onClick={beginEdit}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
          aria-label={`Edit ${ariaLabel}`}
        >
          <Pencil className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      data-inline-edit-trigger="true"
      onClick={beginEdit}
      className={cn(
        "max-w-full rounded-md px-1 py-0.5 text-right text-sm font-medium transition hover:bg-muted/60",
        !trimmed && "text-muted-foreground",
        className,
      )}
      aria-label={`Edit ${ariaLabel}`}
    >
      {trimmed || emptyLabel}
    </button>
  );
}
