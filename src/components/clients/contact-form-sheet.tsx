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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {isEdit
              ? `Edit ${formatContactName(contact!)}`
              : "Add contact"}
          </SheetTitle>
        </SheetHeader>

        <form action={formAction} className="mt-6 space-y-4">
          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          <Field label="First name" required error={state.fieldErrors?.first_name?.[0]}>
            <Input
              name="first_name"
              defaultValue={contact?.first_name ?? ""}
              required
            />
          </Field>
          <Field label="Last name" error={state.fieldErrors?.last_name?.[0]}>
            <Input name="last_name" defaultValue={contact?.last_name ?? ""} />
          </Field>
          <Field label="Email" error={state.fieldErrors?.email?.[0]}>
            <Input
              name="email"
              type="email"
              defaultValue={contact?.email ?? ""}
            />
          </Field>
          <Field label="Phone" error={state.fieldErrors?.phone?.[0]}>
            <Input
              name="phone"
              type="tel"
              defaultValue={contact?.phone ?? ""}
            />
          </Field>
          <Field label="Job title" error={state.fieldErrors?.job_title?.[0]}>
            <Input
              name="job_title"
              defaultValue={contact?.job_title ?? ""}
            />
          </Field>
          <Field label="Notes" error={state.fieldErrors?.notes?.[0]}>
            <Textarea
              name="notes"
              rows={3}
              defaultValue={contact?.pm_notes ?? ""}
            />
          </Field>
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

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save contact" : "Add contact"}
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
