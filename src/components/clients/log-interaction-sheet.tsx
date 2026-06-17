"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import {
  createInteraction,
  updateInteraction,
  type ClientFormState,
} from "@/lib/actions/clients";
import { useActionToast } from "@/hooks/use-action-toast";
import { formatContactName } from "@/lib/clients/contact-utils";
import { ClientSearchSelect } from "@/components/projects/client-search-select";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/sheet-form";
import { interactionTypeOptions } from "@/lib/interactions/display";
import { resolveInteractionContactIds } from "@/lib/interactions/attendees";
import type { InteractionRow } from "@/lib/interactions/types";
import type { SelectOption } from "@/lib/queries/projects";
import { PmEnumValues } from "@/lib/types/enums";
import type { ClientContact } from "@/lib/types";
import { cn } from "@/lib/utils";

const initialState: ClientFormState = {};
const interactionChannels = PmEnumValues.interaction_channel;

type AttendeeDraft = {
  id: string;
  name: string;
  email: string;
  company: string;
};

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

function newAttendeeDraft(): AttendeeDraft {
  return {
    id: crypto.randomUUID(),
    name: "",
    email: "",
    company: "",
  };
}

function attendeeDraftsFromInteraction(interaction: InteractionRow | null) {
  if (!interaction?.attendees.length) return [];
  return interaction.attendees.map((attendee) => ({
    id: attendee.id,
    name: attendee.name,
    email: attendee.email ?? "",
    company: attendee.company ?? "",
  }));
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
  const [body, setBody] = useState(interaction?.body ?? "");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [attendees, setAttendees] = useState<AttendeeDraft[]>([]);

  useEffect(() => {
    if (!open) {
      setSelectedClientId(clientIdProp ?? "");
      setBody("");
      setSelectedContactIds([]);
      setAttendees([]);
      return;
    }
    if (clientIdProp) {
      setSelectedClientId(clientIdProp);
    }
    setBody(interaction?.body ?? "");
    setSelectedContactIds(
      interaction
        ? resolveInteractionContactIds(interaction)
        : contacts.find((contact) => contact.is_primary)?.id
          ? [contacts.find((contact) => contact.is_primary)!.id]
          : [],
    );
    setAttendees(attendeeDraftsFromInteraction(interaction));
  }, [open, clientIdProp, interaction, contacts]);

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

  const selectedContactSummary = useMemo(() => {
    if (selectedContactIds.length === 0) return "No contacts selected";
    return selectedContactIds
      .map((id) => {
        const contact = contacts.find((item) => item.id === id);
        return contact ? formatContactName(contact) : null;
      })
      .filter(Boolean)
      .join(", ");
  }, [contacts, selectedContactIds]);

  const attendeesJson = useMemo(
    () =>
      JSON.stringify(
        attendees
          .map((attendee) => ({
            name: attendee.name.trim(),
            email: attendee.email.trim() || null,
            company: attendee.company.trim() || null,
          }))
          .filter((attendee) => attendee.name.length > 0),
      ),
    [attendees],
  );

  const sheetTitle =
    title ??
    (isEditing ? "Edit interaction" : showClientPicker ? "New interaction" : "Log interaction");

  function handleClientSelect(id: string) {
    setSelectedClientId(id);
    onClientSelect?.(id);
  }

  function toggleContact(contactId: string) {
    setSelectedContactIds((current) =>
      current.includes(contactId)
        ? current.filter((id) => id !== contactId)
        : [...current, contactId],
    );
  }

  function updateAttendee(
    attendeeId: string,
    field: keyof Omit<AttendeeDraft, "id">,
    value: string,
  ) {
    setAttendees((current) =>
      current.map((attendee) =>
        attendee.id === attendeeId ? { ...attendee, [field]: value } : attendee,
      ),
    );
  }

  function removeAttendee(attendeeId: string) {
    setAttendees((current) => current.filter((attendee) => attendee.id !== attendeeId));
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

              <SheetFormField
                label="Contacts"
                error={state.fieldErrors?.contact_ids?.[0]}
              >
                {contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No contacts for this client yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {selectedContactSummary}
                    </p>
                    <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                      {contacts.map((contact) => {
                        const checked = selectedContactIds.includes(contact.id);
                        return (
                          <label
                            key={contact.id}
                            className={cn(
                              "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50",
                              checked && "bg-muted/40",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleContact(contact.id)}
                              className="size-4 rounded border-border"
                            />
                            <span>
                              {formatContactName(contact)}
                              {contact.is_primary ? " (primary)" : ""}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                {selectedContactIds.map((contactId) => (
                  <input
                    key={contactId}
                    type="hidden"
                    name="contact_ids"
                    value={contactId}
                  />
                ))}
              </SheetFormField>

              <SheetFormField
                label="Additional Attendees"
                error={state.fieldErrors?.attendees?.[0]}
              >
                <div className="space-y-3">
                  {attendees.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No additional attendees added.
                    </p>
                  ) : (
                    attendees.map((attendee, index) => (
                      <div
                        key={attendee.id}
                        className="space-y-2 rounded-md border border-border p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Attendee {index + 1}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Remove attendee"
                            onClick={() => removeAttendee(attendee.id)}
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                        <Input
                          value={attendee.name}
                          onChange={(event) =>
                            updateAttendee(attendee.id, "name", event.target.value)
                          }
                          placeholder="Name"
                          className={sheetInputClassName}
                        />
                        <Input
                          value={attendee.email}
                          onChange={(event) =>
                            updateAttendee(attendee.id, "email", event.target.value)
                          }
                          placeholder="Email (optional)"
                          type="email"
                          className={sheetInputClassName}
                        />
                        <Input
                          value={attendee.company}
                          onChange={(event) =>
                            updateAttendee(attendee.id, "company", event.target.value)
                          }
                          placeholder="Company (optional)"
                          className={sheetInputClassName}
                        />
                      </div>
                    ))
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setAttendees((current) => [...current, newAttendeeDraft()])
                    }
                  >
                    <Plus className="size-3.5" />
                    Add attendee
                  </Button>
                </div>
                <input type="hidden" name="attendees_json" value={attendeesJson} />
              </SheetFormField>

              <SheetFormField label="Summary" required error={state.fieldErrors?.summary?.[0]}>
                <Input
                  name="summary"
                  required
                  defaultValue={interaction?.summary ?? ""}
                  className={sheetInputClassName}
                />
              </SheetFormField>

              <SheetFormField label="Details" error={state.fieldErrors?.body?.[0]}>
                <RichTextEditor
                  name="body"
                  value={body}
                  onChange={setBody}
                  placeholder="Add meeting notes, outcomes, follow-ups…"
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
