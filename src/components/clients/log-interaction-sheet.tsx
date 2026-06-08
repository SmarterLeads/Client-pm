"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import {
  createInteraction,
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
import { PmEnumValues } from "@/lib/types/enums";
import type { ClientContact } from "@/lib/types";

const initialState: ClientFormState = {};
const interactionTypes = PmEnumValues.interaction_type;
const interactionChannels = PmEnumValues.interaction_channel;

type LogInteractionSheetProps = {
  clientId: string;
  contacts: ClientContact[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function defaultOccurredAt() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export function LogInteractionSheet({
  clientId,
  contacts,
  open,
  onOpenChange,
}: LogInteractionSheetProps) {
  const router = useRouter();
  const boundAction = createInteraction.bind(null, clientId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  useActionToast(state, {
    successMessage: "Interaction logged",
    onSuccess: () => {
      onOpenChange(false);
      router.refresh();
    },
  });

  const primaryId = contacts.find((c) => c.is_primary)?.id ?? "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Log interaction</SheetTitle>
        </SheetHeader>

        <form action={formAction} className="mt-6 space-y-4">
          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          <Field label="Type" required error={state.fieldErrors?.type?.[0]}>
            <select
              name="type"
              required
              defaultValue="call"
              className="h-8 w-full rounded-lg border border-input px-2.5 text-sm dark:bg-input/30"
            >
              {interactionTypes.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Channel" error={state.fieldErrors?.channel?.[0]}>
            <select
              name="channel"
              defaultValue=""
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
              defaultValue={primaryId}
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
            <Input name="summary" required maxLength={500} />
          </Field>

          <Field label="Details" error={state.fieldErrors?.body?.[0]}>
            <Textarea name="body" rows={4} />
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
              defaultValue={defaultOccurredAt()}
            />
          </Field>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Log interaction"}
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
