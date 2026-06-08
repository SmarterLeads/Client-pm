"use client";

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

type OverviewFieldRowProps = {
  label: React.ReactNode;
  children?: React.ReactNode;
  value?: React.ReactNode;
  editable?: boolean;
  className?: string;
};

export function OverviewFieldRow({
  label,
  children,
  value,
  editable = false,
  className,
}: OverviewFieldRowProps) {
  return (
    <div
      className={cn(
        "group flex min-h-9 items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors",
        editable && "hover:bg-muted/50",
        className,
      )}
    >
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center justify-end gap-1.5 text-sm font-medium">
        {children ?? (
          <span className="truncate text-foreground">{value ?? "—"}</span>
        )}
        {editable ? (
          <Pencil
            className="size-3 shrink-0 text-muted-foreground/0 transition group-hover:text-muted-foreground"
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  );
}
