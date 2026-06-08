"use client";

import { useActionState } from "react";
import {
  createTemplate,
  type TemplateFormState,
} from "@/lib/actions/templates";
import { useActionToast } from "@/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: TemplateFormState = {};

export function NewTemplateForm() {
  const [state, formAction, pending] = useActionState(createTemplate, initialState);

  useActionToast(state, { successMessage: "Template created" });

  return (
    <form action={formAction} className="mx-auto max-w-xl space-y-4">
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div>
        <Label htmlFor="name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input id="name" name="name" required className="mt-1.5" />
        {state.fieldErrors?.name?.[0] ? (
          <p className="mt-1 text-xs text-destructive">{state.fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={4} className="mt-1.5" />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create template"}
      </Button>
    </form>
  );
}
