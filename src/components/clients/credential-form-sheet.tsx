"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  createCredential,
  updateCredential,
  type CredentialFormState,
} from "@/lib/actions/credentials";
import { useActionToast } from "@/hooks/use-action-toast";
import {
  CREDENTIAL_PLATFORM_PRESETS,
  type ClientCredentialRow,
} from "@/lib/credentials/types";
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
  sheetTextareaClassName,
} from "@/components/ui/sheet-form";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const initialState: CredentialFormState = {};

type CredentialFormSheetProps = {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential?: ClientCredentialRow | null;
};

export function CredentialFormSheet({
  clientId,
  open,
  onOpenChange,
  credential = null,
}: CredentialFormSheetProps) {
  const router = useRouter();
  const isEditing = Boolean(credential);
  const [platform, setPlatform] = useState(credential?.platform ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [customPlatform, setCustomPlatform] = useState(false);

  const boundAction = isEditing && credential
    ? updateCredential.bind(null, clientId, credential.id)
    : createCredential.bind(null, clientId);

  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState,
  );

  useEffect(() => {
    if (!open) return;
    const nextPlatform = credential?.platform ?? "";
    setPlatform(nextPlatform);
    setShowPassword(false);
    setCustomPlatform(
      nextPlatform !== "" &&
        !CREDENTIAL_PLATFORM_PRESETS.slice(0, -1).includes(
          nextPlatform as (typeof CREDENTIAL_PLATFORM_PRESETS)[number],
        ),
    );
  }, [open, credential]);

  useActionToast(state, {
    successMessage: isEditing ? "Credentials updated" : "Credentials added",
    onSuccess: () => {
      onOpenChange(false);
      router.refresh();
    },
  });

  function selectPreset(preset: string) {
    if (preset === "Custom") {
      setCustomPlatform(true);
      setPlatform("");
      return;
    }
    setCustomPlatform(false);
    setPlatform(preset);
  }

  const presetActive = (preset: string) => {
    if (preset === "Custom") return customPlatform;
    return !customPlatform && platform === preset;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Edit credentials" : "Add credentials"}
          </SheetTitle>
        </SheetHeader>

        <form
          key={credential?.id ?? "new"}
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

              <SheetFormField
                label="Platform"
                required
                error={state.fieldErrors?.platform?.[0]}
              >
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {CREDENTIAL_PLATFORM_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => selectPreset(preset)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        presetActive(preset)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <Input
                  name="platform"
                  required
                  value={platform}
                  onChange={(event) => setPlatform(event.target.value)}
                  placeholder="Platform name"
                  className={sheetInputClassName}
                />
              </SheetFormField>

              <SheetFormField label="URL" error={state.fieldErrors?.url?.[0]}>
                <Input
                  name="url"
                  type="url"
                  defaultValue={credential?.url ?? ""}
                  placeholder="https://"
                  className={sheetInputClassName}
                />
              </SheetFormField>

              <SheetFormField
                label="Username / Email"
                error={state.fieldErrors?.username?.[0]}
              >
                <Input
                  name="username"
                  defaultValue={credential?.username ?? ""}
                  className={sheetInputClassName}
                />
              </SheetFormField>

              <SheetFormField
                label="Password"
                error={state.fieldErrors?.password?.[0]}
              >
                <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  defaultValue={credential?.password ?? ""}
                  placeholder={isEditing ? "Leave blank to keep current password" : undefined}
                  className={cn(sheetInputClassName, "pr-10")}
                  autoComplete="new-password"
                />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </SheetFormField>

              <SheetFormField label="Notes" error={state.fieldErrors?.notes?.[0]}>
                <Textarea
                  name="notes"
                  defaultValue={credential?.notes ?? ""}
                  rows={3}
                  className={sheetTextareaClassName}
                />
              </SheetFormField>

              <p className="text-xs text-amber-700 dark:text-amber-300">
                Passwords are stored as plain text in the database. Use only
                for non-critical shared access credentials.
              </p>
            </SheetFormBody>
          </SheetBody>

          <SheetFooter>
            <SheetFormActions
              primaryLabel={isEditing ? "Save changes" : "Save credentials"}
              pending={pending}
              onCancel={() => onOpenChange(false)}
            />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
