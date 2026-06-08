import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Shared control styles for sheet / slide-over forms. */
export const sheetFieldControlClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

export const sheetSelectClassName = cn(
  sheetFieldControlClassName,
  "h-auto appearance-none",
);

export const sheetInputClassName = cn(sheetFieldControlClassName, "h-auto");

export const sheetTextareaClassName = cn(
  sheetFieldControlClassName,
  "min-h-[100px] resize-y",
);

export const sheetFieldLabelClassName =
  "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

type SheetFormFieldProps = {
  label: string;
  required?: boolean;
  error?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
};

export function SheetFormField({
  label,
  required,
  error,
  htmlFor,
  className,
  children,
}: SheetFormFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={sheetFieldLabelClassName}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SheetFormBody({
  className,
  children,
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-1 flex-col space-y-5", className)}>
      {children}
    </div>
  );
}

export function SheetFormFooter({
  className,
  children,
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mt-6 shrink-0 border-t border-border pt-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

type SheetFormActionsProps = {
  primaryLabel: string;
  pending?: boolean;
  primaryDisabled?: boolean;
  cancelLabel?: string;
  onCancel?: () => void;
  fullWidthPrimary?: boolean;
};

export function SheetFormActions({
  primaryLabel,
  pending = false,
  primaryDisabled = false,
  cancelLabel = "Cancel",
  onCancel,
  fullWidthPrimary = false,
}: SheetFormActionsProps) {
  return (
    <div
      className={cn(
        "flex gap-2",
        fullWidthPrimary ? "flex-col-reverse sm:flex-row sm:justify-end" : "justify-end",
      )}
    >
      {onCancel ? (
        <Button type="button" variant="outline" onClick={onCancel}>
          {cancelLabel}
        </Button>
      ) : null}
      <Button
        type="submit"
        disabled={pending || primaryDisabled}
        className={fullWidthPrimary ? "w-full sm:w-auto" : undefined}
      >
        {pending ? "Saving…" : primaryLabel}
      </Button>
    </div>
  );
}
