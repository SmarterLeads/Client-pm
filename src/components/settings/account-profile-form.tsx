"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import {
  updateAccountProfile,
  type SettingsFormState,
} from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TeamMember } from "@/lib/types";
import { toastError, toastSuccess } from "@/lib/toast";

const initialState: SettingsFormState = {};

type AccountProfileFormProps = {
  teamMember: TeamMember;
};

export function AccountProfileForm({ teamMember }: AccountProfileFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateAccountProfile,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      toastSuccess("Profile updated");
      router.refresh();
    } else if (state.error) {
      toastError(state.error);
    }
  }, [state.success, state.error, router]);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <Field label="Name" required error={state.fieldErrors?.name?.[0]}>
        <Input name="name" defaultValue={teamMember.name} required />
      </Field>
      <Field label="Email">
        <Input value={teamMember.email} disabled readOnly />
      </Field>
      <Field label="Avatar URL" error={state.fieldErrors?.avatar_url?.[0]}>
        <Input
          name="avatar_url"
          type="url"
          placeholder="https://…"
          defaultValue={teamMember.avatar_url ?? ""}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
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
