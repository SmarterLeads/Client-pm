"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  createInternalProject,
  type InternalFormState,
} from "@/lib/actions/internal";
import {
  PROJECT_STATUS_OPTIONS,
  RAG_STATUS_OPTIONS,
} from "@/lib/projects/field-options";
import { useActionToast } from "@/hooks/use-action-toast";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SheetFooter } from "@/components/ui/sheet";
import {
  SheetFormActions,
  SheetFormBody,
  SheetFormField,
  sheetInputClassName,
  sheetSelectClassName,
} from "@/components/ui/sheet-form";
import type { TeamMember } from "@/lib/types";

const initialState: InternalFormState = {};

type InternalProjectFormProps = {
  teamMembers: Pick<TeamMember, "id" | "name" | "email">[];
  sheetMode?: boolean;
  onCancel?: () => void;
};

export function InternalProjectForm({
  teamMembers,
  sheetMode = false,
  onCancel,
}: InternalProjectFormProps) {
  const [state, formAction, pending] = useActionState(
    createInternalProject,
    initialState,
  );
  const [description, setDescription] = useState("");

  useActionToast(state, { successMessage: "Internal project created" });

  const selectClass = sheetMode
    ? sheetSelectClassName
    : "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";
  const inputClass = sheetMode ? sheetInputClassName : undefined;

  const descriptionField = (
    <RichTextEditor
      name="description"
      value={description}
      onChange={setDescription}
      placeholder="Project scope, goals, notes…"
      minHeightClassName="min-h-[120px]"
    />
  );

  const fields = sheetMode ? (
    <SheetFormBody>
      <SheetFormField
        label="Project name"
        required
        htmlFor="name"
        error={state.fieldErrors?.name?.[0]}
      >
        <Input id="name" name="name" required className={inputClass} />
      </SheetFormField>
      <SheetFormField
        label="Description"
        htmlFor="description"
        error={state.fieldErrors?.description?.[0]}
      >
        {descriptionField}
      </SheetFormField>
      <SheetFormField
        label="Owner"
        htmlFor="owner_id"
        error={state.fieldErrors?.owner_id?.[0]}
      >
        <select
          id="owner_id"
          name="owner_id"
          defaultValue=""
          className={selectClass}
        >
          <option value="">Unassigned</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </SheetFormField>
      <SheetFormField
        label="Status"
        required
        htmlFor="status"
        error={state.fieldErrors?.status?.[0]}
      >
        <select
          id="status"
          name="status"
          required
          defaultValue="planned"
          className={selectClass}
        >
          {PROJECT_STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </SheetFormField>
      <SheetFormField
        label="RAG status"
        required
        htmlFor="rag_status"
        error={state.fieldErrors?.rag_status?.[0]}
      >
        <select
          id="rag_status"
          name="rag_status"
          required
          defaultValue="green"
          className={selectClass}
        >
          {RAG_STATUS_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </SheetFormField>
      <SheetFormField
        label="Start date"
        htmlFor="start_date"
        error={state.fieldErrors?.start_date?.[0]}
      >
        <Input
          id="start_date"
          name="start_date"
          type="date"
          className={inputClass}
        />
      </SheetFormField>
      <SheetFormField
        label="Due date"
        htmlFor="due_date"
        error={state.fieldErrors?.due_date?.[0]}
      >
        <Input id="due_date" name="due_date" type="date" className={inputClass} />
      </SheetFormField>
    </SheetFormBody>
  ) : (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        id="name"
        label="Project name"
        required
        className="sm:col-span-2"
        error={state.fieldErrors?.name?.[0]}
      >
        <Input id="name" name="name" required />
      </Field>
      <Field
        id="description"
        label="Description"
        className="sm:col-span-2"
        error={state.fieldErrors?.description?.[0]}
      >
        {descriptionField}
      </Field>
      <Field
        id="owner_id"
        label="Owner"
        error={state.fieldErrors?.owner_id?.[0]}
      >
        <select
          id="owner_id"
          name="owner_id"
          defaultValue=""
          className={selectClass}
        >
          <option value="">Unassigned</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </Field>
      <Field
        id="status"
        label="Status"
        required
        error={state.fieldErrors?.status?.[0]}
      >
        <select
          id="status"
          name="status"
          required
          defaultValue="planned"
          className={selectClass}
        >
          {PROJECT_STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
      <Field
        id="rag_status"
        label="RAG status"
        required
        error={state.fieldErrors?.rag_status?.[0]}
      >
        <select
          id="rag_status"
          name="rag_status"
          required
          defaultValue="green"
          className={selectClass}
        >
          {RAG_STATUS_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </Field>
      <Field
        id="start_date"
        label="Start date"
        error={state.fieldErrors?.start_date?.[0]}
      >
        <Input id="start_date" name="start_date" type="date" />
      </Field>
      <Field
        id="due_date"
        label="Due date"
        error={state.fieldErrors?.due_date?.[0]}
      >
        <Input id="due_date" name="due_date" type="date" />
      </Field>
    </div>
  );

  return (
    <form
      action={formAction}
      className={
        sheetMode ? "flex min-h-0 flex-1 flex-col" : "mx-auto max-w-2xl space-y-6"
      }
    >
      {state.error ? (
        <p
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      {fields}

      {sheetMode ? (
        <SheetFooter>
          <SheetFormActions
            primaryLabel="Create project"
            pending={pending}
            onCancel={onCancel}
          />
        </SheetFooter>
      ) : (
        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create project"}
          </Button>
          <Button
            type="button"
            variant="outline"
            render={<Link href="/internal/projects" />}
          >
            Cancel
          </Button>
        </div>
      )}
    </form>
  );
}

function Field({
  id,
  label,
  required,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <div className="mt-1.5">{children}</div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
