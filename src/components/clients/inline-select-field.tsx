"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

type InlineSelectFieldProps = {
  value: string;
  options: Option[];
  onSave: (value: string) => Promise<{ error?: string }>;
  className?: string;
  "aria-label": string;
};

export function InlineSelectField({
  value,
  options,
  onSave,
  className,
  "aria-label": ariaLabel,
}: InlineSelectFieldProps) {
  const router = useRouter();
  const [localValue, setLocalValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  function handleChange(next: string) {
    if (next === localValue) return;

    setLocalValue(next);
    setError(null);

    startTransition(async () => {
      const result = await onSave(next);
      if (result.error) {
        setError(result.error);
        toastError(result.error);
        setLocalValue(value);
        return;
      }
      toastSuccess("Client updated");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={localValue}
        disabled={isPending}
        aria-label={ariaLabel}
        aria-invalid={error ? true : undefined}
        data-inline-edit-trigger="true"
        onChange={(e) => handleChange(e.target.value)}
        className={cn(
          "h-8 rounded-lg border border-input bg-background px-2 text-sm font-medium dark:bg-input/30",
          isPending && "opacity-60",
          error && "border-destructive",
          className,
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
