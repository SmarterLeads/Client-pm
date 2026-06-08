"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { XIcon } from "lucide-react";
import {
  createClientUpdate,
  type ClientFormState,
} from "@/lib/actions/clients";
import { useActionToast } from "@/hooks/use-action-toast";
import { getUpdateChannelOptionsForClient } from "@/lib/updates/display";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const initialState: ClientFormState = {};

const fieldControlClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

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
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex h-full w-full max-w-none flex-col gap-0 overflow-hidden p-0 sm:w-[480px]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <SheetTitle className="text-lg font-semibold tracking-tight">
            Log update
          </SheetTitle>
          <SheetClose
            type="button"
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
        </div>

        <form
          action={formAction}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6"
        >
          <div className="flex flex-1 flex-col space-y-6">
            {state.error ? (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            ) : null}

            <Field
              label="Marketing channel"
              required
              error={state.fieldErrors?.marketing_channel?.[0]}
            >
              <select
                name="marketing_channel"
                required
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className={fieldControlClass}
              >
                <option value="">Select channel…</option>
                {channelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            {selectedChannel === "other" ? (
              <Field
                label="Specify type"
                required
                error={state.fieldErrors?.other_detail?.[0]}
              >
                <Input
                  name="other_detail"
                  required
                  placeholder="e.g. Email campaign, CRO audit…"
                  className={cn(fieldControlClass, "h-9 px-3")}
                />
              </Field>
            ) : null}

            <Field
              label="Date & time"
              required
              error={state.fieldErrors?.occurred_at?.[0]}
            >
              <Input
                name="occurred_at"
                type="datetime-local"
                required
                defaultValue={defaultOccurredAt()}
                className={cn(fieldControlClass, "h-9 px-3")}
              />
            </Field>

            <Field
              label="Summary"
              required
              error={state.fieldErrors?.summary?.[0]}
            >
              <Textarea
                name="summary"
                required
                placeholder="What was done?"
                className="min-h-[120px] w-full resize-y rounded-md px-3 py-2"
              />
            </Field>
          </div>

          <div className="mt-8 shrink-0 border-t border-border pt-6">
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Saving…" : "Log update"}
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
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      {children}
      {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
