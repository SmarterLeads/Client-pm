"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  createContact,
  type ClientFormState,
} from "@/lib/actions/clients";
import { useActionToast } from "@/hooks/use-action-toast";
import { ClientSearchSelect } from "@/components/projects/client-search-select";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  SheetFormActions,
  SheetFormBody,
  SheetFormField,
  sheetInputClassName,
} from "@/components/ui/sheet-form";
import type { SelectOption } from "@/lib/queries/projects";

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
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>New contact</SheetTitle>
        </SheetHeader>

        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="py-0">
            <SheetFormBody>
              {state.error ? (
                <p className="text-sm text-destructive" role="alert">
                  {state.error}
                </p>
              ) : null}

              <ClientSearchSelect
                clients={clients}
                onClientSelect={setClientId}
              />

              <SheetFormField
                label="First name"
                required
                error={state.fieldErrors?.first_name?.[0]}
              >
                <Input name="first_name" required className={sheetInputClassName} />
              </SheetFormField>

              <SheetFormField label="Last name" error={state.fieldErrors?.last_name?.[0]}>
                <Input name="last_name" className={sheetInputClassName} />
              </SheetFormField>

              <SheetFormField label="Email" error={state.fieldErrors?.email?.[0]}>
                <Input name="email" type="email" className={sheetInputClassName} />
              </SheetFormField>

              <SheetFormField label="Phone" error={state.fieldErrors?.phone?.[0]}>
                <Input name="phone" type="tel" className={sheetInputClassName} />
              </SheetFormField>

              <SheetFormField label="Job title" error={state.fieldErrors?.job_title?.[0]}>
                <Input name="job_title" className={sheetInputClassName} />
              </SheetFormField>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="is_primary"
                  value="true"
                  className="size-4 rounded border-input"
                />
                Set as primary contact
              </label>
            </SheetFormBody>
          </SheetBody>

          <SheetFooter>
            <SheetFormActions
              primaryLabel="Create contact"
              pending={pending}
              primaryDisabled={!clientId}
              onCancel={() => onOpenChange(false)}
            />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
