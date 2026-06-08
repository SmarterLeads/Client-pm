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
  sheetSelectClassName,
  sheetTextareaClassName,
} from "@/components/ui/sheet-form";
import { Textarea } from "@/components/ui/textarea";
import { interactionTypeOptions } from "@/lib/interactions/display";
import type { InteractionRow } from "@/lib/interactions/types";
import type { SelectOption } from "@/lib/queries/projects";
import { PmEnumValues } from "@/lib/types/enums";
import type { ClientContact } from "@/lib/types";
import { cn } from "@/lib/utils";

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
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{sheetTitle}</SheetTitle>
        </SheetHeader>

        <form
          key={`${interaction?.id ?? "new"}-${effectiveClientId}`}
          action={formAction}
          className="flex min-h-0 flex-1 flex-col"
        >
          <SheetBody className="py-0">
            <SheetFormBody>
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

              <SheetFormField label="Type" required error={state.fieldErrors?.type?.[0]}>
                <select
                  name="type"
                  required
                  defaultValue={interaction?.type ?? "meeting"}
                  className={sheetSelectClassName}
                >
                  {interactionTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </SheetFormField>

              <SheetFormField label="Channel" error={state.fieldErrors?.channel?.[0]}>
                <select
                  name="channel"
                  defaultValue={interaction?.channel ?? ""}
                  className={sheetSelectClassName}
                >
                  <option value="">None</option>
                  {interactionChannels.map((c) => (
                    <option key={c} value={c}>
                      {c.replace("_", " ").replace(/^\w/, (m) => m.toUpperCase())}
                    </option>
                  ))}
                </select>
              </SheetFormField>

              <SheetFormField label="Contact" error={state.fieldErrors?.contact_id?.[0]}>
                <select
                  name="contact_id"
                  defaultValue={interaction?.contact_id ?? primaryId}
                  className={sheetSelectClassName}
                >
                  <option value="">No contact</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {formatContactName(c)}
                      {c.is_primary ? " (primary)" : ""}
                    </option>
                  ))}
                </select>
              </SheetFormField>

              <SheetFormField label="Summary" required error={state.fieldErrors?.summary?.[0]}>
                <Input
                  name="summary"
                  required
                  maxLength={500}
                  defaultValue={interaction?.summary ?? ""}
                  className={sheetInputClassName}
                />
              </SheetFormField>

              <SheetFormField label="Details" error={state.fieldErrors?.body?.[0]}>
                <Textarea
                  name="body"
                  defaultValue={interaction?.body ?? ""}
                  className={sheetTextareaClassName}
                />
              </SheetFormField>

              <SheetFormField
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
                  className={sheetInputClassName}
                />
              </SheetFormField>
            </SheetFormBody>
          </SheetBody>

          <SheetFooter>
            <SheetFormActions
              primaryLabel={
                isEditing ? "Save changes" : "Log interaction"
              }
              pending={pending}
              primaryDisabled={showClientPicker && !effectiveClientId}
              onCancel={() => onOpenChange(false)}
            />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
