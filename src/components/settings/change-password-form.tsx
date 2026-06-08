"use client";

import { useActionState, useEffect } from "react";
import {
  changePassword,
  type SettingsFormState,
} from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toastError, toastSuccess } from "@/lib/toast";

const initialState: SettingsFormState = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePassword,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      toastSuccess("Password changed");
    } else if (state.error) {
      toastError(state.error);
    }
  }, [state.success, state.error]);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <Field
        label="Current password"
        required
        error={state.fieldErrors?.current_password?.[0]}
      >
        <Input name="current_password" type="password" required autoComplete="current-password" />
      </Field>
      <Field
        label="New password"
        required
        error={state.fieldErrors?.new_password?.[0]}
      >
        <Input name="new_password" type="password" required autoComplete="new-password" />
      </Field>
      <Field
        label="Confirm new password"
        required
        error={state.fieldErrors?.confirm_password?.[0]}
      >
        <Input name="confirm_password" type="password" required autoComplete="new-password" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Updating…" : "Change password"}
      </Button>
    </form>
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
