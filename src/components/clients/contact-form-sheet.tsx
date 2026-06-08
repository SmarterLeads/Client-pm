"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import {
  createContact,
  updateContact,
  type ClientFormState,
} from "@/lib/actions/clients";
import { useActionToast } from "@/hooks/use-action-toast";
import { formatContactName } from "@/lib/clients/contact-utils";
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
  sheetTextareaClassName,
} from "@/components/ui/sheet-form";
import { Textarea } from "@/components/ui/textarea";
import type { ClientContact } from "@/lib/types";

const initialState: ClientFormState = {};

type ContactFormSheetProps = {
  clientId: string;
  contact?: ClientContact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ContactFormSheet({
  clientId,
  contact,
  open,
  onOpenChange,
}: ContactFormSheetProps) {
  const router = useRouter();
  const isEdit = Boolean(contact);

  const boundAction = isEdit
    ? updateContact.bind(null, clientId, contact!.id)
    : createContact.bind(null, clientId);

  const [state, formAction, pending] = useActionState(boundAction, initialState);

  useActionToast(state, {
    successMessage: isEdit ? "Contact updated" : "Contact created",
    onSuccess: () => {
      onOpenChange(false);
      router.refresh();
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>
            {isEdit
              ? `Edit ${formatContactName(contact!)}`
              : "Add contact"}
          </SheetTitle>
        </SheetHeader>

        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="py-0">
            <SheetFormBody>
              {state.error ? (
                <p className="text-sm text-destructive" role="alert">
                  {state.error}
                </p>
              ) : null}

              <SheetFormField
                label="First name"
                required
                error={state.fieldErrors?.first_name?.[0]}
              >
                <Input
                  name="first_name"
                  defaultValue={contact?.first_name ?? ""}
                  required
                  className={sheetInputClassName}
                />
              </SheetFormField>

              <SheetFormField label="Last name" error={state.fieldErrors?.last_name?.[0]}>
                <Input
                  name="last_name"
                  defaultValue={contact?.last_name ?? ""}
                  className={sheetInputClassName}
                />
              </SheetFormField>

              <SheetFormField label="Email" error={state.fieldErrors?.email?.[0]}>
                <Input
                  name="email"
                  type="email"
                  defaultValue={contact?.email ?? ""}
                  className={sheetInputClassName}
                />
              </SheetFormField>

              <SheetFormField label="Phone" error={state.fieldErrors?.phone?.[0]}>
                <Input
                  name="phone"
                  type="tel"
                  defaultValue={contact?.phone ?? ""}
                  className={sheetInputClassName}
                />
              </SheetFormField>

              <SheetFormField label="Job title" error={state.fieldErrors?.job_title?.[0]}>
                <Input
                  name="job_title"
                  defaultValue={contact?.job_title ?? ""}
                  className={sheetInputClassName}
                />
              </SheetFormField>

              <SheetFormField
                label="Preferred contact"
                error={state.fieldErrors?.preferred_contact_method?.[0]}
              >
                <Input
                  name="preferred_contact_method"
                  defaultValue={contact?.preferred_contact_method ?? ""}
                  placeholder="e.g. WhatsApp, Email, Call after 2pm"
                  className={sheetInputClassName}
                />
              </SheetFormField>

              <SheetFormField label="Notes" error={state.fieldErrors?.notes?.[0]}>
                <Textarea
                  name="notes"
                  defaultValue={contact?.pm_notes ?? ""}
                  className={sheetTextareaClassName}
                />
              </SheetFormField>

              {!isEdit || !contact?.is_primary ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="is_primary"
                    value="true"
                    defaultChecked={contact?.is_primary ?? false}
                    className="size-4 rounded border-input"
                  />
                  Set as primary contact
                </label>
              ) : (
                <input type="hidden" name="is_primary" value="true" />
              )}
            </SheetFormBody>
          </SheetBody>

          <SheetFooter>
            <SheetFormActions
              primaryLabel={isEdit ? "Save contact" : "Add contact"}
              pending={pending}
              onCancel={() => onOpenChange(false)}
            />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
