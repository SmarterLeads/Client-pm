"use client";

import { InlineDateField } from "@/components/clients/inline-date-field";
import { InlineSelectField } from "@/components/clients/inline-select-field";
import { InlineTextField } from "@/components/clients/inline-text-field";
import { RagDot } from "@/components/clients/rag-dot";
import {
  PROJECT_STATUS_OPTIONS,
  RAG_STATUS_OPTIONS,
} from "@/lib/projects/field-options";
import type { ProjectStatus, RagStatus, TeamMember } from "@/lib/types";

const PROJECT_UPDATED = "Project updated";

type ProjectEditableHeaderProps = {
  name: string;
  status: ProjectStatus;
  ragStatus: RagStatus;
  dueDate: string | null;
  ownerId: string | null;
  teamMembers: Pick<TeamMember, "id" | "name" | "email">[];
  onUpdate: (updates: Record<string, unknown>) => Promise<{ error?: string }>;
  subtitlePrefix?: React.ReactNode;
  footer?: React.ReactNode;
};

export function ProjectEditableHeader({
  name,
  status,
  ragStatus,
  dueDate,
  ownerId,
  teamMembers,
  onUpdate,
  subtitlePrefix,
  footer,
}: ProjectEditableHeaderProps) {
  const ownerOptions = [
    { value: "", label: "Unassigned" },
    ...teamMembers.map((m) => ({ value: m.id, label: m.name })),
  ];

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <InlineTextField
          value={name}
          onSave={(value) => onUpdate({ name: value ?? "" })}
          aria-label="Project name"
          successMessage={PROJECT_UPDATED}
          className="text-left text-2xl font-semibold tracking-tight"
          inputClassName="h-10 text-2xl font-semibold"
        />

        <p className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-muted-foreground">
          {subtitlePrefix}
          {subtitlePrefix ? (
            <span className="text-muted-foreground/60" aria-hidden>
              ·
            </span>
          ) : null}
          <InlineSelectField
            aria-label="Project owner"
            value={ownerId ?? ""}
            options={ownerOptions}
            className="h-7 min-w-[8rem] border-transparent bg-transparent px-1 font-normal text-muted-foreground shadow-none hover:bg-muted/60 dark:bg-transparent"
            successMessage={PROJECT_UPDATED}
            onSave={(value) => onUpdate({ owner_id: value || null })}
          />
          <span className="text-muted-foreground/60" aria-hidden>
            ·
          </span>
          <span className="inline-flex items-center gap-1">
            <span>Due</span>
            <InlineDateField
              value={dueDate}
              onSave={(value) => onUpdate({ due_date: value })}
              aria-label="Due date"
              emptyLabel="No due date"
              successMessage={PROJECT_UPDATED}
            />
          </span>
        </p>

        {footer}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <RagDot status={ragStatus} />
          <InlineSelectField
            aria-label="RAG status"
            value={ragStatus}
            options={RAG_STATUS_OPTIONS}
            className="h-8 min-w-[6.5rem]"
            successMessage={PROJECT_UPDATED}
            onSave={(value) =>
              onUpdate({ rag_status: value as RagStatus })
            }
          />
        </div>
        <InlineSelectField
          aria-label="Project status"
          value={status}
          options={PROJECT_STATUS_OPTIONS}
          className="h-8 min-w-[7.5rem]"
          successMessage={PROJECT_UPDATED}
          onSave={(value) =>
            onUpdate({ status: value as ProjectStatus })
          }
        />
      </div>
    </div>
  );
}
