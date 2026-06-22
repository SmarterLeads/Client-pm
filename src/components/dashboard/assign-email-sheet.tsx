"use client";

import { useActionState } from "react";
import {
  assignEmailToClient,
  type AssignEmailFormState,
} from "@/lib/actions/email-log";
import { useActionToast } from "@/hooks/use-action-toast";
import { ClientSearchSelect } from "@/components/projects/client-search-select";
import type { EmailLog } from "@/lib/types";
import type { SelectOption } from "@/lib/queries/projects";
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
} from "@/components/ui/sheet-form";

const initialState: AssignEmailFormState = {};

type AssignEmailSheetProps = {
  email: EmailLog | null;
  clients: SelectOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AssignEmailSheet({
  email,
  clients,
  open,
  onOpenChange,
}: AssignEmailSheetProps) {
  const [state, formAction, isPending] = useActionState(
    assignEmailToClient,
    initialState,
  );

  useActionToast(state, {
    successMessage: "Email assigned to client.",
    onSuccess: () => onOpenChange(false),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Assign email to client</SheetTitle>
        </SheetHeader>

        {email ? (
          <form action={formAction}>
            <SheetBody>
              <SheetFormBody>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {email.subject?.trim() || "(No subject)"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    From {email.from_email}
                  </p>
                </div>

                <input type="hidden" name="email_log_id" value={email.id} />

                <ClientSearchSelect clients={clients} />
              </SheetFormBody>
            </SheetBody>

            <SheetFooter>
              <SheetFormActions
                primaryLabel="Save"
                pending={isPending}
                cancelLabel="Cancel"
                onCancel={() => onOpenChange(false)}
              />
            </SheetFooter>

            {state.error ? (
              <p className="px-4 pb-4 text-sm text-destructive">{state.error}</p>
            ) : null}
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
