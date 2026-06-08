"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import {
  updateClientOverviewFields,
} from "@/lib/actions/clients";
import { ClientMrrBreakdownSection } from "@/components/clients/client-mrr-breakdown-section";
import { ClientContactsSection } from "@/components/clients/client-contacts-section";
import { ClientOverviewMarketingConfigSection } from "@/components/clients/client-overview-marketing-config-section";
import { EditAddressSheet } from "@/components/clients/edit-address-sheet";
import { InlineDollarField } from "@/components/clients/inline-dollar-field";
import { InlineSelectField } from "@/components/clients/inline-select-field";
import { InlineTextField } from "@/components/clients/inline-text-field";
import { LastContactedIndicator } from "@/components/clients/last-contacted-indicator";
import {
  OverviewCard,
  OverviewFieldRow,
  OverviewSectionDivider,
  OverviewSubsection,
} from "@/components/clients/overview-ui";
import { PortalUsersSection } from "@/components/clients/portal-users-section";
import { RagDot } from "@/components/clients/rag-dot";
import { Button } from "@/components/ui/button";
import {
  formatClientAddressSingleLine,
  normalizeOverviewClientType,
  normalizeOverviewStatus,
  normalizeClientCurrency,
  CLIENT_CURRENCY_OPTIONS,
  OVERVIEW_CLIENT_TYPES,
  OVERVIEW_STATUS_OPTIONS,
  type OverviewStatus,
} from "@/lib/clients/overview-fields";
import type { ClientPlatformConnection } from "@/lib/queries/clients";
import { PmEnumValues } from "@/lib/types/enums";
import type { Client, ClientContact, ClientUser, TeamMember } from "@/lib/types";

const ragStatuses = PmEnumValues.rag_status;

type ClientOverviewTabProps = {
  client: Client;
  agencyName: string | null;
  contacts: ClientContact[];
  lastInteractionAt: string | null;
  teamMembers: Pick<TeamMember, "id" | "name" | "email">[];
  portalUsers: ClientUser[];
  platformConnections: ClientPlatformConnection[];
  canViewMrr: boolean;
};

export function ClientOverviewTab({
  client,
  agencyName,
  contacts = [],
  lastInteractionAt,
  teamMembers = [],
  portalUsers = [],
  platformConnections,
  canViewMrr,
}: ClientOverviewTabProps) {
  const [addressEditOpen, setAddressEditOpen] = useState(false);

  const saveField = (updates: Record<string, unknown>) =>
    updateClientOverviewFields(client.id, updates);

  const statusValue = normalizeOverviewStatus(client.status);
  const ragValue = client.rag_status ?? "green";
  const clientTypeValue = normalizeOverviewClientType(client.client_type);
  const currencyValue = normalizeClientCurrency(client.currency);
  const formattedAddress = formatClientAddressSingleLine(client);

  const managerOptions = [
    { value: "", label: "Unassigned" },
    ...teamMembers.map((m) => ({ value: m.id, label: m.name })),
  ];

  const ragOptions = ragStatuses.map((r) => ({
    value: r,
    label: r.charAt(0).toUpperCase() + r.slice(1),
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <OverviewCard title="Company Info">
          <OverviewFieldRow editable label="Display name">
            <InlineTextField
              value={client.name}
              onSave={(value) => saveField({ name: value ?? "" })}
              aria-label="Display name"
            />
          </OverviewFieldRow>
          <OverviewFieldRow editable label="Legal name">
            <InlineTextField
              value={client.legal_name}
              onSave={(value) => saveField({ legal_name: value })}
              aria-label="Legal name"
            />
          </OverviewFieldRow>
          <OverviewFieldRow editable label="Website URL">
            <InlineTextField
              value={client.website_url}
              type="url"
              onSave={(value) => saveField({ website_url: value })}
              aria-label="Website URL"
            />
          </OverviewFieldRow>
          <OverviewFieldRow editable label="Google My Business">
            <InlineTextField
              value={client.gmb_url}
              type="url"
              onSave={(value) => saveField({ gmb_url: value })}
              aria-label="Google My Business"
            />
          </OverviewFieldRow>
          <OverviewFieldRow editable label="Business phone">
            <InlineTextField
              value={client.business_phone}
              onSave={(value) => saveField({ business_phone: value })}
              aria-label="Business phone"
            />
          </OverviewFieldRow>
          <OverviewFieldRow editable label="Industry">
            <InlineTextField
              value={client.industry}
              onSave={(value) => saveField({ industry: value })}
              aria-label="Industry"
            />
          </OverviewFieldRow>
          <OverviewFieldRow editable label="Client type">
            <InlineSelectField
              aria-label="Client type"
              value={clientTypeValue}
              options={[...OVERVIEW_CLIENT_TYPES]}
              onSave={(value) => saveField({ client_type: value })}
            />
          </OverviewFieldRow>
          <OverviewFieldRow editable label="HST number">
            <InlineTextField
              value={client.hst_number}
              onSave={(value) => saveField({ hst_number: value })}
              aria-label="HST number"
            />
          </OverviewFieldRow>

          <OverviewSectionDivider />
          <OverviewSubsection title="Business Address">
            <div className="flex items-start justify-between gap-3 px-2 py-1.5">
              <p
                className={
                  formattedAddress
                    ? "min-w-0 flex-1 text-sm text-foreground"
                    : "min-w-0 flex-1 text-sm text-muted-foreground"
                }
              >
                {formattedAddress ?? "No address on file"}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setAddressEditOpen(true)}
                aria-label="Edit address"
              >
                <Pencil className="size-3.5" />
              </Button>
            </div>
          </OverviewSubsection>
        </OverviewCard>

        <OverviewCard title="Account Info">
          <OverviewFieldRow label="Agency" value={agencyName ?? "—"} />
          <OverviewFieldRow editable label="Account manager">
            <InlineSelectField
              aria-label="Account manager"
              value={client.account_manager_id ?? ""}
              options={managerOptions}
              className="min-w-[10rem]"
              onSave={(value) =>
                saveField({ account_manager_id: value || null })
              }
            />
          </OverviewFieldRow>
          <OverviewFieldRow editable label="Status">
            <InlineSelectField
              aria-label="Client status"
              value={statusValue}
              options={[...OVERVIEW_STATUS_OPTIONS]}
              onSave={(value) =>
                saveField({ status: value as OverviewStatus })
              }
            />
          </OverviewFieldRow>
          <OverviewFieldRow editable label="RAG status">
            <div className="flex items-center gap-2">
              <RagDot status={ragValue} />
              <InlineSelectField
                aria-label="RAG status"
                value={ragValue}
                options={ragOptions}
                className="min-w-[7rem]"
                onSave={(value) =>
                  saveField({ rag_status: value as Client["rag_status"] })
                }
              />
            </div>
          </OverviewFieldRow>
          {canViewMrr ? (
            <>
              <OverviewFieldRow editable label="Currency">
                <InlineSelectField
                  aria-label="Currency"
                  value={currencyValue}
                  options={[...CLIENT_CURRENCY_OPTIONS]}
                  className="min-w-[5rem]"
                  onSave={(value) => saveField({ currency: value })}
                />
              </OverviewFieldRow>
              <OverviewFieldRow editable label="Total MRR (monthly)">
                <InlineDollarField
                  cents={client.mrr_cents}
                  currency={currencyValue}
                  aria-label="Total monthly recurring revenue"
                  onSave={(cents) => saveField({ mrr_cents: cents })}
                />
              </OverviewFieldRow>
              <ClientMrrBreakdownSection
                client={client}
                onSaveBreakdown={(mrr_breakdown) =>
                  saveField({ mrr_breakdown })
                }
              />
            </>
          ) : null}
          <ClientOverviewMarketingConfigSection
            client={client}
            connections={platformConnections}
            embedded
          />
        </OverviewCard>
      </div>

      <ClientContactsSection clientId={client.id} contacts={contacts ?? []} />

      <PortalUsersSection clientId={client.id} portalUsers={portalUsers ?? []} />

      <div className="rounded-lg border border-border bg-card px-5 py-4 shadow-sm">
        <OverviewFieldRow label="Last contacted">
          <LastContactedIndicator lastInteractionAt={lastInteractionAt} />
        </OverviewFieldRow>
      </div>

      <EditAddressSheet
        client={client}
        open={addressEditOpen}
        onOpenChange={setAddressEditOpen}
      />
    </div>
  );
}
