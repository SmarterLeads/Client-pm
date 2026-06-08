"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import {
  createClientUpdate,
  type ClientFormState,
} from "@/lib/actions/clients";
import { useActionToast } from "@/hooks/use-action-toast";
import { getUpdateChannelOptionsForClient } from "@/lib/updates/display";
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

const initialState: ClientFormState = {};

type LogUpdateSheetProps = {
  clientId: string;
  marketingChannels: string[] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function defaultOccurredAt() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export function LogUpdateSheet({
  clientId,
  marketingChannels,
  open,
  onOpenChange,
}: LogUpdateSheetProps) {
  const router = useRouter();
  const boundAction = createClientUpdate.bind(null, clientId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [selectedChannel, setSelectedChannel] = useState("");
  const channelOptions = getUpdateChannelOptionsForClient(marketingChannels);

  useActionToast(state, {
    successMessage: "Update logged",
    onSuccess: () => {
      onOpenChange(false);
      setSelectedChannel("");
      router.refresh();
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Log update</SheetTitle>
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
                label="Marketing channel"
                required
                error={state.fieldErrors?.marketing_channel?.[0]}
              >
                <select
                  name="marketing_channel"
                  required
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className={sheetSelectClassName}
                >
                  <option value="">Select channel…</option>
                  {channelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </SheetFormField>

              {selectedChannel === "other" ? (
                <SheetFormField
                  label="Specify type"
                  required
                  error={state.fieldErrors?.other_detail?.[0]}
                >
                  <Input
                    name="other_detail"
                    required
                    placeholder="e.g. Email campaign, CRO audit…"
                    className={sheetInputClassName}
                  />
                </SheetFormField>
              ) : null}

              <SheetFormField
                label="Date & time"
                required
                error={state.fieldErrors?.occurred_at?.[0]}
              >
                <Input
                  name="occurred_at"
                  type="datetime-local"
                  required
                  defaultValue={defaultOccurredAt()}
                  className={sheetInputClassName}
                />
              </SheetFormField>

              <SheetFormField
                label="Summary"
                required
                error={state.fieldErrors?.summary?.[0]}
              >
                <Textarea
                  name="summary"
                  required
                  placeholder="What was done?"
                  className={sheetTextareaClassName}
                />
              </SheetFormField>
            </SheetFormBody>
          </SheetBody>

          <SheetFooter>
            <SheetFormActions
              primaryLabel="Log update"
              pending={pending}
              onCancel={() => onOpenChange(false)}
            />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
