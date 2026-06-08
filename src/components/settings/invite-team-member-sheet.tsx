"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  inviteTeamMember,
  type SettingsFormState,
} from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AgencyListRow } from "@/lib/queries/agencies";
import { PmEnumValues } from "@/lib/types/enums";
import { toastError, toastSuccess } from "@/lib/toast";

const initialState: SettingsFormState = {};
const roles = PmEnumValues.team_member_role;

type InviteTeamMemberSheetProps = {
  agencies: AgencyListRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InviteTeamMemberSheet({
  agencies,
  open,
  onOpenChange,
}: InviteTeamMemberSheetProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    inviteTeamMember,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      if (state.tempPassword) {
        toast.success(
          `Team member invited. Temporary password: ${state.tempPassword}`,
          { duration: 10000 },
        );
      } else {
        toastSuccess("Team member invited");
      }
      onOpenChange(false);
      router.refresh();
    } else if (state.error) {
      toastError(state.error);
    }
  }, [state.success, state.error, state.tempPassword, onOpenChange, router]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Invite team member</SheetTitle>
        </SheetHeader>

        <form action={formAction} className="mt-6 space-y-4">
          <Field label="Name" required error={state.fieldErrors?.name?.[0]}>
            <Input name="name" required />
          </Field>
          <Field label="Email" required error={state.fieldErrors?.email?.[0]}>
            <Input name="email" type="email" required />
          </Field>
          <Field label="Role" required error={state.fieldErrors?.role?.[0]}>
            <select
              name="role"
              defaultValue="member"
              className="h-8 w-full rounded-lg border border-input px-2.5 text-sm dark:bg-input/30"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role.replace("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Agency" error={state.fieldErrors?.agency_id?.[0]}>
            <select
              name="agency_id"
              defaultValue=""
              className="h-8 w-full rounded-lg border border-input px-2.5 text-sm dark:bg-input/30"
            >
              <option value="">None</option>
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Inviting…" : "Send invite"}
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
