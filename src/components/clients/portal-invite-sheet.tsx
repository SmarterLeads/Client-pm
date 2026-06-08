"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  invitePortalUser,
  type PortalFormState,
} from "@/lib/actions/portal";
import { useActionToast } from "@/hooks/use-action-toast";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  SheetFormActions,
  SheetFormBody,
  SheetFormField,
  sheetInputClassName,
  sheetSelectClassName,
} from "@/components/ui/sheet-form";
import { CheckIcon, CopyIcon } from "lucide-react";

const initialState: PortalFormState = {};

type PortalInviteSheetProps = {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PortalInviteSheet({
  clientId,
  open,
  onOpenChange,
}: PortalInviteSheetProps) {
  const router = useRouter();
  const boundAction = invitePortalUser.bind(null, clientId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useActionToast(state);

  useEffect(() => {
    if (state.success && state.tempPassword) {
      toast.success("Portal user invited", { duration: 4000 });
      setCreatedPassword(state.tempPassword);
      router.refresh();
    }
  }, [state.success, state.tempPassword, router]);

  useEffect(() => {
    if (!open) {
      setCreatedPassword(null);
      setCopied(false);
    }
  }, [open]);

  async function handleCopy() {
    if (!createdPassword) return;

    try {
      await navigator.clipboard.writeText(createdPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = createdPassword;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Invite to portal</SheetTitle>
          <SheetDescription>
            Create portal access so your client can sign in at /portal/login.
          </SheetDescription>
        </SheetHeader>

        {createdPassword ? (
          <SheetBody>
            <div className="space-y-5">
              <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-100">
                <CheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                <p className="font-medium">Portal user created</p>
              </div>

              <SheetFormField label="Temporary password">
                <div className="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-2">
                  <code className="flex-1 font-mono text-sm tracking-wide">
                    {createdPassword}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleCopy()}
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="size-4" aria-hidden />
                        Copied
                      </>
                    ) : (
                      <>
                        <CopyIcon className="size-4" aria-hidden />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </SheetFormField>

              <p className="text-sm text-gray-500 dark:text-muted-foreground">
                Share this with your client using their email address.
              </p>

              <p className="text-xs text-amber-700 dark:text-amber-400">
                This password is only shown once — copy it now.
              </p>
            </div>
          </SheetBody>
        ) : (
          <form action={formAction} className="flex min-h-0 flex-1 flex-col">
            <SheetBody className="py-0">
              <SheetFormBody>
                {state.error ? (
                  <p className="text-sm text-destructive" role="alert">
                    {state.error}
                  </p>
                ) : null}

                <SheetFormField label="Email" required error={state.fieldErrors?.email?.[0]}>
                  <Input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="contact@company.com"
                    className={sheetInputClassName}
                  />
                </SheetFormField>

                <SheetFormField label="Name" error={state.fieldErrors?.name?.[0]}>
                  <Input
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Optional display name"
                    className={sheetInputClassName}
                  />
                </SheetFormField>

                <SheetFormField
                  label="Access level"
                  required
                  error={state.fieldErrors?.access_level?.[0]}
                >
                  <select
                    name="access_level"
                    required
                    defaultValue="viewer"
                    className={sheetSelectClassName}
                  >
                    <option value="viewer">Viewer — read-only access</option>
                    <option value="approver">
                      Approver — can approve milestones
                    </option>
                  </select>
                </SheetFormField>

                <p className="text-sm text-gray-500 dark:text-muted-foreground">
                  A temporary password will be generated. Share it with your
                  client so they can sign in at /portal/login.
                </p>
              </SheetFormBody>
            </SheetBody>

            <SheetFooter>
              <SheetFormActions
                primaryLabel="Create portal user"
                pending={pending}
                onCancel={() => onOpenChange(false)}
                fullWidthPrimary
              />
            </SheetFooter>
          </form>
        )}

        {createdPassword ? (
          <SheetFooter>
            <Button
              type="button"
              className="w-full sm:ml-auto sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
