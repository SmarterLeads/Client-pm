"use client";

import Link from "next/link";
import { useState } from "react";

import {
  updateClientOverviewFields,
  updateContactFields,
} from "@/lib/actions/clients";
import { ClientMrrBreakdownSection } from "@/components/clients/client-mrr-breakdown-section";
import { ClientContactsSection } from "@/components/clients/client-contacts-section";
import { ClientOverviewMarketingConfigSection } from "@/components/clients/client-overview-marketing-config-section";
import { ClientOverviewPlatformIdsSection } from "@/components/clients/client-overview-platform-ids-section";
import { ContactFormSheet } from "@/components/clients/contact-form-sheet";
import { InlineDollarField } from "@/components/clients/inline-dollar-field";
import { InlineSelectField } from "@/components/clients/inline-select-field";
import { InlineTextField } from "@/components/clients/inline-text-field";
import { LastContactedIndicator } from "@/components/clients/last-contacted-indicator";
import { OverviewCard, OverviewFieldRow } from "@/components/clients/overview-ui";
import { PortalUsersSection } from "@/components/clients/portal-users-section";
import { RagDot } from "@/components/clients/rag-dot";
import { Button } from "@/components/ui/button";
import { formatContactName } from "@/lib/clients/contact-utils";
import {
  formatClientAddress,
  isAddressComplete,
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
  primaryContact: ClientContact | null;
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
  primaryContact,
  contacts = [],
  lastInteractionAt,
  teamMembers = [],
  portalUsers = [],
  platformConnections,
  canViewMrr,
}: ClientOverviewTabProps) {
  const [contactEditOpen, setContactEditOpen] = useState(false);

  const saveField = (updates: Record<string, unknown>) =>
    updateClientOverviewFields(client.id, updates);

  const statusValue = normalizeOverviewStatus(client.status);
  const ragValue = client.rag_status ?? "green";
  const clientTypeValue = normalizeOverviewClientType(client.client_type);
  const currencyValue = normalizeClientCurrency(client.currency);
  const formattedAddress = formatClientAddress(client);
  const showAddressPreview = isAddressComplete(client) && formattedAddress;

  const managerOptions = [
    { value: "", label: "Unassigned" },
    ...teamMembers.map((m) => ({ value: m.id, label: m.name })),
  ];

  const ragOptions = ragStatuses.map((r) => ({
    value: r,
    label: r.charAt(0).toUpperCase() + r.slice(1),
  }));

  function scrollToContacts() {
    document
      .getElementById("client-contacts-section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Row 1 */}
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
              <OverviewFieldRow editable label="Total MRR (monthly)">
                <InlineDollarField
                  cents={client.mrr_cents}
                  currency={currencyValue}
                  aria-label="Total monthly recurring revenue"
                  onSave={(cents) => saveField({ mrr_cents: cents })}
                />
              </OverviewFieldRow>
              <OverviewFieldRow editable label="Currency">
                <InlineSelectField
                  aria-label="Currency"
                  value={currencyValue}
                  options={[...CLIENT_CURRENCY_OPTIONS]}
                  className="min-w-[5rem]"
                  onSave={(value) => saveField({ currency: value })}
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
        </OverviewCard>

        {/* Row 2 */}
        <OverviewCard title="Business Address">
          {showAddressPreview ? (
            <p className="mb-3 whitespace-pre-wrap rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-sm">
              {formattedAddress}
            </p>
          ) : null}
          <OverviewFieldRow editable label="Street">
            <InlineTextField
              value={client.address_street}
              onSave={(value) => saveField({ address_street: value })}
              aria-label="Street"
            />
          </OverviewFieldRow>
          <OverviewFieldRow editable label="City">
            <InlineTextField
              value={client.address_city}
              onSave={(value) => saveField({ address_city: value })}
              aria-label="City"
            />
          </OverviewFieldRow>
          <OverviewFieldRow editable label="Province">
            <InlineTextField
              value={client.address_province}
              onSave={(value) => saveField({ address_province: value })}
              aria-label="Province"
            />
          </OverviewFieldRow>
          <OverviewFieldRow editable label="Postal code">
            <InlineTextField
              value={client.address_postal_code}
              onSave={(value) => saveField({ address_postal_code: value })}
              aria-label="Postal code"
            />
          </OverviewFieldRow>
          <OverviewFieldRow editable label="Country">
            <InlineTextField
              value={client.address_country ?? "Canada"}
              onSave={(value) => saveField({ address_country: value })}
              aria-label="Country"
            />
          </OverviewFieldRow>
        </OverviewCard>

        <OverviewCard title="Primary Contact">
          {primaryContact ? (
            <>
              <OverviewFieldRow
                label="Name"
                value={
                  <button
                    type="button"
                    onClick={() => setContactEditOpen(true)}
                    className="text-primary hover:underline"
                  >
                    {formatContactName(primaryContact)}
                  </button>
                }
              />
              <OverviewFieldRow
                label="Email"
                value={
                  primaryContact.email ? (
                    <Link
                      href={`mailto:${primaryContact.email}`}
                      className="text-primary hover:underline"
                    >
                      {primaryContact.email}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <OverviewFieldRow
                label="Phone"
                value={primaryContact.phone ?? "—"}
              />
              <OverviewFieldRow
                label="Job title"
                value={primaryContact.job_title ?? "—"}
              />
              <OverviewFieldRow editable label="Preferred contact">
                <InlineTextField
                  value={primaryContact.preferred_contact_method}
                  onSave={(value) =>
                    updateContactFields(client.id, primaryContact.id, {
                      preferred_contact_method: value,
                    })
                  }
                  aria-label="Preferred contact method"
                  placeholder="e.g. WhatsApp, Email, Call after 2pm"
                />
              </OverviewFieldRow>
              <div className="flex flex-wrap gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setContactEditOpen(true)}
                >
                  Edit contact
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={scrollToContacts}
                >
                  View all contacts
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="px-2 text-sm text-muted-foreground">
                No primary contact set.
              </p>
              <div className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={scrollToContacts}
                >
                  View all contacts
                </Button>
              </div>
            </>
          )}
        </OverviewCard>

        {/* Row 3 */}
        <ClientOverviewMarketingConfigSection client={client} />

        <ClientOverviewPlatformIdsSection
          client={client}
          connections={platformConnections}
        />
      </div>

      <ClientContactsSection clientId={client.id} contacts={contacts ?? []} />

      <PortalUsersSection clientId={client.id} portalUsers={portalUsers ?? []} />

      <div className="rounded-lg border border-border bg-card px-5 py-4 shadow-sm">
        <OverviewFieldRow label="Last contacted">
          <LastContactedIndicator lastInteractionAt={lastInteractionAt} />
        </OverviewFieldRow>
      </div>

      {primaryContact ? (
        <ContactFormSheet
          clientId={client.id}
          contact={primaryContact}
          open={contactEditOpen}
          onOpenChange={setContactEditOpen}
        />
      ) : null}
    </div>
  );
}
