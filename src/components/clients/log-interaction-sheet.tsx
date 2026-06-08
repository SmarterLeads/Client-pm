"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  createInteraction,
  updateInteraction,
  type ClientFormState,
} from "@/lib/actions/clients";
import { useActionToast } from "@/hooks/use-action-toast";
import { formatContactName } from "@/lib/clients/contact-utils";
import { ClientSearchSelect } from "@/components/projects/client-search-select";
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
import { interactionTypeOptions } from "@/lib/interactions/display";
import type { InteractionRow } from "@/lib/interactions/types";
import type { SelectOption } from "@/lib/queries/projects";
import { PmEnumValues } from "@/lib/types/enums";
import type { ClientContact } from "@/lib/types";

const initialState: ClientFormState = {};
const interactionChannels = PmEnumValues.interaction_channel;

type LogInteractionSheetProps = {
  clientId?: string;
  clients?: SelectOption[];
  contacts?: ClientContact[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interaction?: InteractionRow | null;
  title?: string;
  onClientSelect?: (clientId: string) => void;
};

function newOccurredAtLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function toDatetimeLocalValue(iso: string) {
  const date = new Date(iso);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export function LogInteractionSheet({
  clientId: clientIdProp,
  clients,
  contacts = [],
  open,
  onOpenChange,
  interaction = null,
  title,
  onClientSelect,
}: LogInteractionSheetProps) {
  const router = useRouter();
  const isEditing = Boolean(interaction);
  const [selectedClientId, setSelectedClientId] = useState(clientIdProp ?? "");

  useEffect(() => {
    if (!open) {
      setSelectedClientId(clientIdProp ?? "");
      return;
    }
    if (clientIdProp) {
      setSelectedClientId(clientIdProp);
    }
  }, [open, clientIdProp]);

  const effectiveClientId = clientIdProp ?? selectedClientId;
  const showClientPicker = Boolean(clients?.length) && !clientIdProp && !isEditing;

  const createAction =
    effectiveClientId
      ? createInteraction.bind(null, effectiveClientId)
      : async () =>
          ({ error: "Select a client first." }) satisfies ClientFormState;

  const [state, formAction, pending] = useActionState(
    isEditing && interaction && clientIdProp
      ? updateInteraction.bind(null, clientIdProp, interaction.id)
      : createAction,
    initialState,
  );

  useActionToast(state, {
    successMessage: isEditing ? "Interaction updated" : "Interaction logged",
    onSuccess: () => {
      onOpenChange(false);
      router.refresh();
    },
  });

  const primaryId = contacts.find((c) => c.is_primary)?.id ?? "";
  const sheetTitle =
    title ??
    (isEditing ? "Edit interaction" : showClientPicker ? "New interaction" : "Log interaction");

  function handleClientSelect(id: string) {
    setSelectedClientId(id);
    onClientSelect?.(id);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{sheetTitle}</SheetTitle>
        </SheetHeader>

        <form
          key={`${interaction?.id ?? "new"}-${effectiveClientId}`}
          action={formAction}
          className="mt-6 space-y-4"
        >
          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          {showClientPicker && clients ? (
            <ClientSearchSelect
              clients={clients}
              onClientSelect={handleClientSelect}
            />
          ) : null}

          <Field label="Type" required error={state.fieldErrors?.type?.[0]}>
            <select
              name="type"
              required
              defaultValue={interaction?.type ?? "meeting"}
              className="h-8 w-full rounded-lg border border-input px-2.5 text-sm dark:bg-input/30"
            >
              {interactionTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Channel" error={state.fieldErrors?.channel?.[0]}>
            <select
              name="channel"
              defaultValue={interaction?.channel ?? ""}
              className="h-8 w-full rounded-lg border border-input px-2.5 text-sm dark:bg-input/30"
            >
              <option value="">None</option>
              {interactionChannels.map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ").replace(/^\w/, (m) => m.toUpperCase())}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Contact" error={state.fieldErrors?.contact_id?.[0]}>
            <select
              name="contact_id"
              defaultValue={interaction?.contact_id ?? primaryId}
              className="h-8 w-full rounded-lg border border-input px-2.5 text-sm dark:bg-input/30"
            >
              <option value="">No contact</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {formatContactName(c)}
                  {c.is_primary ? " (primary)" : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Summary" required error={state.fieldErrors?.summary?.[0]}>
            <Input
              name="summary"
              required
              maxLength={500}
              defaultValue={interaction?.summary ?? ""}
            />
          </Field>

          <Field label="Details" error={state.fieldErrors?.body?.[0]}>
            <Textarea
              name="body"
              rows={4}
              defaultValue={interaction?.body ?? ""}
            />
          </Field>

          <Field
            label="Occurred at"
            required
            error={state.fieldErrors?.occurred_at?.[0]}
          >
            <Input
              name="occurred_at"
              type="datetime-local"
              required
              defaultValue={
                interaction
                  ? toDatetimeLocalValue(interaction.occurred_at)
                  : newOccurredAtLocal()
              }
            />
          </Field>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={pending || (showClientPicker && !effectiveClientId)}>
              {pending
                ? "Saving…"
                : isEditing
                  ? "Save changes"
                  : "Log interaction"}
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
