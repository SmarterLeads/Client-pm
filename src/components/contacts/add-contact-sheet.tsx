"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import type { SelectOption } from "@/lib/queries/projects";

const initialState: ClientFormState = {};

type AddContactSheetProps = {
  clients: SelectOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddContactSheet({
  clients,
  open,
  onOpenChange,
}: AddContactSheetProps) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [step, setStep] = useState<"pick-client" | "form">("pick-client");

  useEffect(() => {
    if (!open) {
      setClientId("");
      setStep("pick-client");
    }
  }, [open]);

  const boundAction = clientId
    ? createContact.bind(null, clientId)
    : async () => ({ error: "Select a client first." } satisfies ClientFormState);

  const [state, formAction, pending] = useActionState(boundAction, initialState);

  useActionToast(state, {
    successMessage: "Contact created",
    onSuccess: () => {
      onOpenChange(false);
      router.refresh();
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Add contact</SheetTitle>
        </SheetHeader>

        {step === "pick-client" ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose the client this contact belongs to.
            </p>
            <ClientPicker
              clients={clients}
              onSelect={(id) => setClientId(id)}
            />
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                disabled={!clientId}
                onClick={() => setStep("form")}
              >
                Continue
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <form action={formAction} className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Client:{" "}
              <span className="font-medium text-foreground">
                {clients.find((c) => c.id === clientId)?.name ?? "—"}
              </span>
            </p>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-sm"
              onClick={() => setStep("pick-client")}
            >
              Change client
            </Button>

            {state.error ? (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            ) : null}

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
            <Field
              label="Preferred contact"
              error={state.fieldErrors?.preferred_contact_method?.[0]}
            >
              <Input
                name="preferred_contact_method"
                placeholder="e.g. WhatsApp, Email, Call after 2pm"
              />
            </Field>
            <Field label="Notes" error={state.fieldErrors?.notes?.[0]}>
              <Textarea name="notes" rows={3} />
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
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Add contact"}
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
        )}
      </SheetContent>
    </Sheet>
  );
}

function ClientPicker({
  clients,
  onSelect,
}: {
  clients: SelectOption[];
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = query.trim()
    ? clients.filter((c) =>
        c.name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : clients;

  return (
    <div>
      <Label htmlFor="add_contact_client_search">Client</Label>
      <Input
        id="add_contact_client_search"
        list="add-contact-client-options"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          const match = clients.find(
            (c) => c.name.toLowerCase() === e.target.value.trim().toLowerCase(),
          );
          onSelect(match?.id ?? "");
        }}
        placeholder="Search clients…"
        className="mt-1.5"
        autoComplete="off"
      />
      <datalist id="add-contact-client-options">
        {filtered.slice(0, 50).map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>
    </div>
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
