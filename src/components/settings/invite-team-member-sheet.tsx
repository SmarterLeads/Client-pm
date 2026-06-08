"use client";

import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
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
import { toastError, toastSuccess } from "@/lib/toast";

const initialState: SettingsFormState = {};
const inviteRoles = ["admin", "manager", "member"] as const;

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

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
  const [sessionId, setSessionId] = useState(0);

  useEffect(() => {
    if (open) {
      setSessionId((current) => current + 1);
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        {open ? (
          <InviteTeamMemberForm
            key={sessionId}
            agencies={agencies}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function InviteTeamMemberForm({
  agencies,
  onClose,
}: {
  agencies: AgencyListRow[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    inviteTeamMember,
    initialState,
  );
  const [allAgencies, setAllAgencies] = useState(false);
  const [selectedAgencyIds, setSelectedAgencyIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const inviteComplete = Boolean(state.success && state.tempPassword);

  useEffect(() => {
    if (state.error) {
      toastError(state.error);
    }
  }, [state.error]);

  useEffect(() => {
    if (state.success && !state.tempPassword) {
      toastSuccess("Team member invited");
      onClose();
      router.refresh();
    }
  }, [state.success, state.tempPassword, onClose, router]);

  function toggleAgency(agencyId: string, checked: boolean) {
    setSelectedAgencyIds((current) => {
      const next = checked
        ? [...new Set([...current, agencyId])]
        : current.filter((id) => id !== agencyId);
      setAllAgencies(next.length === agencies.length && agencies.length > 0);
      return next;
    });
  }

  function handleAllAgenciesChange(checked: boolean) {
    setAllAgencies(checked);
    setSelectedAgencyIds(checked ? agencies.map((agency) => agency.id) : []);
  }

  async function copyPassword() {
    if (!state.tempPassword) return;
    try {
      await navigator.clipboard.writeText(state.tempPassword);
      setCopied(true);
      toastSuccess("Password copied");
    } catch {
      toastError("Could not copy password");
    }
  }

  function handleDone() {
    onClose();
    router.refresh();
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          {inviteComplete ? "Team member invited" : "Invite team member"}
        </SheetTitle>
      </SheetHeader>

      {inviteComplete ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
              Temporary password
            </p>
            <p className="mt-2 font-mono text-lg tracking-wide text-emerald-950 dark:text-emerald-50">
              {state.tempPassword}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 border-emerald-300 bg-white hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:hover:bg-emerald-900"
              onClick={copyPassword}
            >
              <Copy className="size-4" />
              {copied ? "Copied" : "Copy password"}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Share this with {state.invitedName ?? "the new team member"} to log
            in at{" "}
            <a
              href={`${siteUrl}/login`}
              className="font-medium text-foreground underline"
            >
              {siteUrl}/login
            </a>
            .
          </p>

          <Button type="button" onClick={handleDone}>
            Done
          </Button>
        </div>
      ) : (
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
              {inviteRoles.map((role) => (
                <option key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="can_view_mrr"
              value="true"
              className="size-4 rounded border-input"
            />
            Can view MRR
          </label>

          <div>
            <Label>Agencies</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose which agencies this member can access.
            </p>
            <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="all_agencies"
                  value="true"
                  checked={allAgencies}
                  onChange={(e) => handleAllAgenciesChange(e.target.checked)}
                  className="size-4 rounded border-input"
                />
                All agencies
              </label>
              <div className="space-y-2 border-t border-border pt-2">
                {agencies.map((agency) => (
                  <label
                    key={agency.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="agency_ids"
                      value={agency.id}
                      checked={selectedAgencyIds.includes(agency.id)}
                      onChange={(e) => toggleAgency(agency.id, e.target.checked)}
                      className="size-4 rounded border-input"
                    />
                    {agency.name}
                  </label>
                ))}
              </div>
            </div>
            {state.fieldErrors?.agency_ids?.[0] ? (
              <p className="mt-1 text-xs text-destructive">
                {state.fieldErrors.agency_ids[0]}
              </p>
            ) : null}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Inviting…" : "Send invite"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </>
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
