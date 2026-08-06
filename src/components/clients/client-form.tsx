"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  createClient,
  type ClientFormState,
} from "@/lib/actions/clients";
import { useActionToast } from "@/hooks/use-action-toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SheetFooter } from "@/components/ui/sheet";
import {
  SheetFormActions,
  SheetFormBody,
  SheetFormField,
  sheetInputClassName,
  sheetSelectClassName,
  sheetTextareaClassName,
} from "@/components/ui/sheet-form";
import { Textarea } from "@/components/ui/textarea";
import { CLIENT_STATUSES } from "@/lib/pm/constants";
import {
  CREATE_CLIENT_PLATFORM_FIELDS,
  CREATE_CLIENT_TYPE_OPTIONS,
} from "@/lib/clients/create-client-platforms";
import { MARKETING_CHANNEL_OPTIONS } from "@/lib/clients/overview-fields";
import { slugifyClientName } from "@/lib/clients/report-slug";
import { PmEnumValues } from "@/lib/types/enums";
import type { AgencyListRow } from "@/lib/queries/agencies";
import type { TeamMember } from "@/lib/types";
import { cn } from "@/lib/utils";

const initialState: ClientFormState = {};
const statuses = CLIENT_STATUSES;
const ragStatuses = PmEnumValues.rag_status;

type ClientFormProps = {
  teamMembers: Pick<TeamMember, "id" | "name" | "email">[];
  agencies: AgencyListRow[];
  agencyId?: string | null;
  sheetMode?: boolean;
  onCancel?: () => void;
};

export function ClientForm({
  teamMembers,
  agencies,
  agencyId,
  sheetMode = false,
  onCancel,
}: ClientFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createClient, initialState);
  const redirectedClientId = useRef<string | null>(null);
  const [reportSlug, setReportSlug] = useState("");
  const [reportSlugManual, setReportSlugManual] = useState(false);

  useActionToast(state, { successMessage: "Client created" });

  function handleCompanyNameChange(value: string) {
    if (!reportSlugManual) {
      setReportSlug(slugifyClientName(value));
    }
  }

  function handleReportSlugChange(value: string) {
    setReportSlugManual(true);
    setReportSlug(value);
  }

  useEffect(() => {
    if (!state.success || !state.clientId) return;
    if (redirectedClientId.current === state.clientId) return;

    redirectedClientId.current = state.clientId;
    if (sheetMode) onCancel?.();
    router.push(`/clients/${state.clientId}`);
  }, [state.success, state.clientId, router, sheetMode, onCancel]);

  const selectClass = sheetMode
    ? sheetSelectClassName
    : "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";
  const inputClass = sheetMode ? sheetInputClassName : undefined;
  const textareaClass = sheetMode ? sheetTextareaClassName : undefined;

  return (
    <form
      action={formAction}
      className={
        sheetMode
          ? "flex min-h-0 flex-1 flex-col"
          : "mx-auto max-w-2xl space-y-8"
      }
    >
      {agencyId ? (
        <input type="hidden" name="agency_id" value={agencyId} />
      ) : (
        <section className={sheetMode ? "contents" : "space-y-4"}>
          {!sheetMode ? (
            <h2 className="text-sm font-medium text-muted-foreground">Agency</h2>
          ) : null}
          <Field
            id="agency_id"
            label="Agency"
            required
            sheetMode={sheetMode}
            error={state.fieldErrors?.agency_id?.[0]}
          >
            <select
              id="agency_id"
              name="agency_id"
              required
              defaultValue=""
              className={selectClass}
            >
              <option value="" disabled>
                Select an agency
              </option>
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name}
                </option>
              ))}
            </select>
          </Field>
        </section>
      )}
      {state.error ? (
        <p
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      {sheetMode ? (
        <SheetFormBody>
          <Field id="name" label="Company name" required sheetMode error={state.fieldErrors?.name?.[0]}>
            <Input
              id="name"
              name="name"
              required
              className={inputClass}
              onChange={(e) => handleCompanyNameChange(e.target.value)}
            />
          </Field>
          <Field id="status" label="Status" required sheetMode error={state.fieldErrors?.status?.[0]}>
            <select id="status" name="status" required defaultValue="prospect" className={selectClass}>
              {statuses.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </Field>
          <Field id="rag_status" label="RAG status" required sheetMode error={state.fieldErrors?.rag_status?.[0]}>
            <select id="rag_status" name="rag_status" required defaultValue="green" className={selectClass}>
              {ragStatuses.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </Field>
          <Field id="account_manager_id" label="Account manager" sheetMode error={state.fieldErrors?.account_manager_id?.[0]}>
            <select id="account_manager_id" name="account_manager_id" defaultValue="" className={selectClass}>
              <option value="">Unassigned</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </Field>
          <Field id="website_url" label="Website URL" sheetMode error={state.fieldErrors?.website_url?.[0]}>
            <Input id="website_url" name="website_url" type="url" className={inputClass} />
          </Field>
          <Field id="gmb_url" label="Google My Business" sheetMode error={state.fieldErrors?.gmb_url?.[0]}>
            <Input id="gmb_url" name="gmb_url" type="url" className={inputClass} />
          </Field>
          <Field id="google_drive_url" label="Google Drive" sheetMode error={state.fieldErrors?.google_drive_url?.[0]}>
            <Input
              id="google_drive_url"
              name="google_drive_url"
              type="url"
              placeholder="https://drive.google.com/drive/folders/..."
              className={inputClass}
            />
          </Field>
          <Field id="business_phone" label="Business phone" sheetMode error={state.fieldErrors?.business_phone?.[0]}>
            <Input id="business_phone" name="business_phone" type="tel" className={inputClass} />
          </Field>
          <Field id="notes" label="Notes" sheetMode error={state.fieldErrors?.notes?.[0]}>
            <Textarea id="notes" name="notes" rows={4} className={textareaClass} />
          </Field>
          <MarketingChannelsField sheetMode />
          <MarketingDashboardFields
            sheetMode
            reportSlug={reportSlug}
            onReportSlugChange={handleReportSlugChange}
            fieldErrors={state.fieldErrors}
            inputClass={inputClass}
            selectClass={selectClass}
          />
          <Field id="contact_first_name" label="First name" required sheetMode error={state.fieldErrors?.["primary_contact.first_name"]?.[0]}>
            <Input id="contact_first_name" name="contact_first_name" required className={inputClass} />
          </Field>
          <Field id="contact_last_name" label="Last name" sheetMode error={state.fieldErrors?.["primary_contact.last_name"]?.[0]}>
            <Input id="contact_last_name" name="contact_last_name" className={inputClass} />
          </Field>
          <Field id="contact_email" label="Email" sheetMode error={state.fieldErrors?.["primary_contact.email"]?.[0]}>
            <Input id="contact_email" name="contact_email" type="email" className={inputClass} />
          </Field>
          <Field id="contact_phone" label="Phone" sheetMode error={state.fieldErrors?.["primary_contact.phone"]?.[0]}>
            <Input id="contact_phone" name="contact_phone" type="tel" className={inputClass} />
          </Field>
          <Field id="contact_job_title" label="Job title" sheetMode error={state.fieldErrors?.["primary_contact.job_title"]?.[0]}>
            <Input id="contact_job_title" name="contact_job_title" className={inputClass} />
          </Field>
        </SheetFormBody>
      ) : (
        <>
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">Client</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="name" label="Company name" required className="sm:col-span-2" error={state.fieldErrors?.name?.[0]}>
                <Input
                  id="name"
                  name="name"
                  required
                  onChange={(e) => handleCompanyNameChange(e.target.value)}
                />
              </Field>
              <Field id="status" label="Status" required error={state.fieldErrors?.status?.[0]}>
                <select id="status" name="status" required defaultValue="prospect" className={selectClass}>
                  {statuses.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </Field>
              <Field id="rag_status" label="RAG status" required error={state.fieldErrors?.rag_status?.[0]}>
                <select id="rag_status" name="rag_status" required defaultValue="green" className={selectClass}>
                  {ragStatuses.map((r) => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </Field>
              <Field id="account_manager_id" label="Account manager" className="sm:col-span-2" error={state.fieldErrors?.account_manager_id?.[0]}>
                <select id="account_manager_id" name="account_manager_id" defaultValue="" className={selectClass}>
                  <option value="">Unassigned</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </Field>
              <Field id="website_url" label="Website URL" className="sm:col-span-2" error={state.fieldErrors?.website_url?.[0]}>
                <Input id="website_url" name="website_url" type="url" />
              </Field>
              <Field id="gmb_url" label="Google My Business" className="sm:col-span-2" error={state.fieldErrors?.gmb_url?.[0]}>
                <Input id="gmb_url" name="gmb_url" type="url" />
              </Field>
              <Field id="google_drive_url" label="Google Drive" className="sm:col-span-2" error={state.fieldErrors?.google_drive_url?.[0]}>
                <Input
                  id="google_drive_url"
                  name="google_drive_url"
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/..."
                />
              </Field>
              <Field id="business_phone" label="Business phone" className="sm:col-span-2" error={state.fieldErrors?.business_phone?.[0]}>
                <Input id="business_phone" name="business_phone" type="tel" />
              </Field>
              <Field id="notes" label="Notes" className="sm:col-span-2" error={state.fieldErrors?.notes?.[0]}>
                <Textarea id="notes" name="notes" rows={4} />
              </Field>
            </div>
          </section>
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              Marketing channels
            </h2>
            <MarketingChannelsField />
          </section>
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              Marketing dashboard
            </h2>
            <MarketingDashboardFields
              reportSlug={reportSlug}
              onReportSlugChange={handleReportSlugChange}
              fieldErrors={state.fieldErrors}
              selectClass={selectClass}
            />
          </section>
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">Primary contact</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="contact_first_name" label="First name" required error={state.fieldErrors?.["primary_contact.first_name"]?.[0]}>
                <Input id="contact_first_name" name="contact_first_name" required />
              </Field>
              <Field id="contact_last_name" label="Last name" error={state.fieldErrors?.["primary_contact.last_name"]?.[0]}>
                <Input id="contact_last_name" name="contact_last_name" />
              </Field>
              <Field id="contact_email" label="Email" error={state.fieldErrors?.["primary_contact.email"]?.[0]}>
                <Input id="contact_email" name="contact_email" type="email" />
              </Field>
              <Field id="contact_phone" label="Phone" error={state.fieldErrors?.["primary_contact.phone"]?.[0]}>
                <Input id="contact_phone" name="contact_phone" type="tel" />
              </Field>
              <Field id="contact_job_title" label="Job title" className="sm:col-span-2" error={state.fieldErrors?.["primary_contact.job_title"]?.[0]}>
                <Input id="contact_job_title" name="contact_job_title" />
              </Field>
            </div>
          </section>
        </>
      )}

      {sheetMode ? (
        <SheetFooter>
          <SheetFormActions
            primaryLabel="Create client"
            pending={pending}
            onCancel={onCancel}
          />
        </SheetFooter>
      ) : (
        <div className="flex gap-3">
          <button type="submit" disabled={pending} className={cn(buttonVariants())}>
            {pending ? "Creating…" : "Create client"}
          </button>
          <Button type="button" variant="outline" render={<Link href="/clients" />}>
            Cancel
          </Button>
        </div>
      )}
    </form>
  );
}

function MarketingChannelsField({ sheetMode = false }: { sheetMode?: boolean }) {
  const grid = (
    <div className="grid gap-2 sm:grid-cols-2">
      {MARKETING_CHANNEL_OPTIONS.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition hover:bg-muted/40"
        >
          <input
            type="checkbox"
            name="marketing_channels"
            value={option.value}
            className="size-4 rounded border-input"
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );

  if (sheetMode) {
    return (
      <SheetFormField label="Marketing channels">
        {grid}
      </SheetFormField>
    );
  }

  return grid;
}

function MarketingDashboardFields({
  sheetMode = false,
  reportSlug,
  onReportSlugChange,
  fieldErrors,
  inputClass,
  selectClass,
}: {
  sheetMode?: boolean;
  reportSlug: string;
  onReportSlugChange: (value: string) => void;
  fieldErrors?: Record<string, string[]>;
  inputClass?: string;
  selectClass?: string;
}) {
  const selectCls =
    selectClass ??
    "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";

  const fields = (
    <div className="space-y-4">
      <Field
        id="client_type"
        label="Client type"
        sheetMode={sheetMode}
        error={fieldErrors?.client_type?.[0]}
      >
        <select
          id="client_type"
          name="client_type"
          defaultValue="lead_gen"
          className={selectCls}
        >
          {CREATE_CLIENT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="show_in_dashboard"
          value="true"
          className="size-4 rounded border-input"
        />
        <span>Show in dashboard</span>
      </label>

      <Field
        id="report_slug"
        label="Report slug"
        sheetMode={sheetMode}
        error={fieldErrors?.report_slug?.[0]}
        className="sm:col-span-2"
      >
        <Input
          id="report_slug"
          name="report_slug"
          value={reportSlug}
          onChange={(e) => onReportSlugChange(e.target.value)}
          placeholder="brafit-iq"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Auto-generated from company name; used for marketing report URLs.
        </p>
      </Field>

      <div className="space-y-3">
        <p className="text-sm font-medium">Platform connections</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {CREATE_CLIENT_PLATFORM_FIELDS.map((field) => (
            <Field
              key={field.formKey}
              id={field.formKey}
              label={field.label}
              sheetMode={sheetMode}
              error={fieldErrors?.[field.formKey]?.[0]}
            >
              <Input
                id={field.formKey}
                name={field.formKey}
                className={inputClass}
                placeholder="Account ID"
              />
            </Field>
          ))}
        </div>
      </div>
    </div>
  );

  if (sheetMode) {
    return <>{fields}</>;
  }

  return fields;
}

function Field({
  id,
  label,
  required,
  error,
  className,
  sheetMode = false,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  sheetMode?: boolean;
  children: React.ReactNode;
}) {
  if (sheetMode) {
    return (
      <SheetFormField
        label={label}
        required={required}
        error={error}
        htmlFor={id}
        className={className}
      >
        {children}
      </SheetFormField>
    );
  }

  return (
    <div className={className}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <div className="mt-1.5">{children}</div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
