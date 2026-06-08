"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import {
  updateClient,
  type ClientFormState,
} from "@/lib/actions/clients";
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
import { CLIENT_STATUSES } from "@/lib/pm/constants";
import { PmEnumValues } from "@/lib/types/enums";
import { useActionToast } from "@/hooks/use-action-toast";
import type { Client, TeamMember } from "@/lib/types";

const initialState: ClientFormState = {};
const statuses = CLIENT_STATUSES;
const ragStatuses = PmEnumValues.rag_status;

type ClientEditSheetProps = {
  client: Client;
  teamMembers: Pick<TeamMember, "id" | "name" | "email">[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ClientEditSheet({
  client,
  teamMembers,
  open,
  onOpenChange,
}: ClientEditSheetProps) {
  const router = useRouter();
  const boundAction = updateClient.bind(null, client.id);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  useActionToast(state, {
    successMessage: "Client updated",
    onSuccess: () => {
      onOpenChange(false);
      router.refresh();
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit client</SheetTitle>
        </SheetHeader>

        <form action={formAction} className="mt-6 space-y-4">
          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          <Field label="Company name" required error={state.fieldErrors?.name?.[0]}>
            <Input name="name" defaultValue={client.name} required />
          </Field>
          <Field label="Status" required error={state.fieldErrors?.status?.[0]}>
            <select
              name="status"
              defaultValue={client.status}
              className="h-8 w-full rounded-lg border border-input px-2.5 text-sm dark:bg-input/30"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="RAG" required error={state.fieldErrors?.rag_status?.[0]}>
            <select
              name="rag_status"
              defaultValue={client.rag_status}
              className="h-8 w-full rounded-lg border border-input px-2.5 text-sm dark:bg-input/30"
            >
              {ragStatuses.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Account manager"
            error={state.fieldErrors?.account_manager_id?.[0]}
          >
            <select
              name="account_manager_id"
              defaultValue={client.account_manager_id ?? ""}
              className="h-8 w-full rounded-lg border border-input px-2.5 text-sm dark:bg-input/30"
            >
              <option value="">Unassigned</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Notes" error={state.fieldErrors?.notes?.[0]}>
            <Textarea
              name="notes"
              rows={4}
              defaultValue={client.pm_notes ?? ""}
            />
          </Field>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
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
