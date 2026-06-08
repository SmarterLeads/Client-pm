"use client";

import { useRef } from "react";
import { Pencil } from "lucide-react";

import { cn } from "@/lib/utils";

type OverviewCardProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
};

export function OverviewCard({
  title,
  children,
  className,
  headerAction,
}: OverviewCardProps) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-card p-5 shadow-sm",
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {headerAction}
      </div>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

export function OverviewSectionDivider() {
  return <div className="my-4 border-t border-border" role="separator" />;
}

type OverviewSubsectionProps = {
  title: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  className?: string;
};

export function OverviewSubsection({
  title,
  children,
  headerAction,
  className,
}: OverviewSubsectionProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold tracking-tight">{title}</h4>
        {headerAction}
      </div>
      {children}
    </div>
  );
}

type OverviewFieldRowProps = {
  label: React.ReactNode;
  children?: React.ReactNode;
  value?: React.ReactNode;
  editable?: boolean;
  className?: string;
};

function fieldLabelText(label: React.ReactNode): string {
  return typeof label === "string" ? label : "field";
}

export function OverviewFieldRow({
  label,
  children,
  value,
  editable = false,
  className,
}: OverviewFieldRowProps) {
  const valueRef = useRef<HTMLDivElement>(null);

  function triggerInlineEdit() {
    const root = valueRef.current;
    if (!root) return;

    const trigger = root.querySelector<HTMLElement>(
      '[data-inline-edit-trigger="true"]',
    );

    if (trigger) {
      if (trigger instanceof HTMLSelectElement) {
        trigger.focus();
        return;
      }

      trigger.click();
      return;
    }

    const input = root.querySelector<HTMLInputElement>("input");
    if (input) {
      input.focus();
      return;
    }

    root.querySelector<HTMLButtonElement>('button[type="button"]')?.click();
  }

  function handlePencilClick() {
    triggerInlineEdit();
  }

  return (
    <div
      className={cn(
        "group flex min-h-9 items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors",
        editable && "hover:bg-muted/50",
        className,
      )}
    >
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <div
        ref={valueRef}
        className="flex min-w-0 items-center justify-end gap-1.5 text-sm font-medium"
      >
        {children ?? (
          <span className="truncate text-foreground">{value ?? "—"}</span>
        )}
        {editable ? (
          <button
            type="button"
            onClick={handlePencilClick}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 opacity-100 transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 sm:opacity-0 sm:group-hover:opacity-100"
            aria-label={`Edit ${fieldLabelText(label)}`}
          >
            <Pencil className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
