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
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
      // Fallback for older browsers
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
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Invite to portal</SheetTitle>
        </SheetHeader>

        {createdPassword ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-100">
              <CheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p className="font-medium">Portal user created</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Temporary password</p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
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
            </div>

            <p className="text-sm text-muted-foreground">
              Share this with your client to log in at{" "}
              <span className="font-medium text-foreground">/portal/login</span>{" "}
              with their email address.
            </p>

            <p className="text-xs text-amber-700 dark:text-amber-400">
              This password is only shown once — copy it now.
            </p>

            <Button
              type="button"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        ) : (
          <form action={formAction} className="mt-6 space-y-4">
            {state.error ? (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            ) : null}

            <Field label="Email" required error={state.fieldErrors?.email?.[0]}>
              <Input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="contact@company.com"
              />
            </Field>

            <Field label="Name" error={state.fieldErrors?.name?.[0]}>
              <Input
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Optional display name"
              />
            </Field>

            <Field
              label="Access level"
              required
              error={state.fieldErrors?.access_level?.[0]}
            >
              <select
                name="access_level"
                required
                defaultValue="viewer"
                className="h-8 w-full rounded-lg border border-input px-2.5 text-sm dark:bg-input/30"
              >
                <option value="viewer">Viewer — read-only access</option>
                <option value="approver">
                  Approver — can approve milestones
                </option>
              </select>
            </Field>

            <p className="text-xs text-muted-foreground">
              A temporary password will be generated. Share it with your client
              so they can sign in at /portal/login.
            </p>

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Creating user…" : "Create portal user"}
            </Button>
          </form>
        )}
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
    <div className="space-y-2">
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
