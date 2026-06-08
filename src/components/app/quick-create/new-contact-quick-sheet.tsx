"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  createContact,
  type ClientFormState,
} from "@/lib/actions/clients";
import { useActionToast } from "@/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { SelectOption } from "@/lib/queries/projects";
import { ClientSearchSelect } from "@/components/projects/client-search-select";

const initialState: ClientFormState = {};

type NewContactQuickSheetProps = {
  clients: SelectOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewContactQuickSheet({
  clients,
  open,
  onOpenChange,
}: NewContactQuickSheetProps) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setClientId("");
      redirectedRef.current = false;
    }
  }, [open]);

  const boundAction = clientId
    ? createContact.bind(null, clientId)
    : async () =>
        ({ error: "Select a client first." }) satisfies ClientFormState;

  const [state, formAction, pending] = useActionState(boundAction, initialState);

  useActionToast(state, { successMessage: "Contact created" });

  useEffect(() => {
    if (!state.success || !clientId || redirectedRef.current) return;
    redirectedRef.current = true;
    onOpenChange(false);
    router.push(`/clients/${clientId}?tab=overview`);
  }, [state.success, clientId, onOpenChange, router]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>New contact</SheetTitle>
        </SheetHeader>

        <form action={formAction} className="mt-6 space-y-4">
          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          <ClientSearchSelect
            clients={clients}
            onClientSelect={setClientId}
          />

          <Field label="First name" required error={state.fieldErrors?.first_name?.[0]}>
            <Input name="first_name" required />
          </Field>
          <Field label="Last name" error={state.fieldErrors?.last_name?.[0]}>
            <Input name="last_name" />
          </Field>
          <Field label="Email" error={state.fieldErrors?.email?.[0]}>
            <Input name="email" type="email" />
          </Field>
          <Field label="Phone" error={state.fieldErrors?.phone?.[0]}>
            <Input name="phone" type="tel" />
          </Field>
          <Field label="Job title" error={state.fieldErrors?.job_title?.[0]}>
            <Input name="job_title" />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_primary"
              value="true"
              className="size-4 rounded border-input"
            />
            Set as primary contact
          </label>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={pending || !clientId}>
              {pending ? "Saving…" : "Create contact"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <div className="mt-1.5">{children}</div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
