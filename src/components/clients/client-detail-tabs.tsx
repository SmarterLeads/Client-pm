"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ClientAccessTab } from "@/components/clients/client-access-tab";
import { ClientActionsMenu } from "@/components/clients/client-actions-menu";
import { ClientUpdatesTab } from "@/components/clients/client-updates-tab";
import { ClientInteractionsTab } from "@/components/clients/client-interactions-tab";
import { ClientMarketingBriefTab } from "@/components/clients/client-marketing-brief-tab";
import { ClientMarketingSubTabs } from "@/components/clients/client-marketing-sub-tabs";
import { ClientOverviewTab } from "@/components/clients/client-overview-tab";
import { ClientProjectsTab } from "@/components/clients/client-projects-tab";
import { RagDot } from "@/components/clients/rag-dot";
import { StatusBadge } from "@/components/clients/status-badge";
import { AgencyBadge } from "@/components/team/agency-badge";
import { FileUploadZone } from "@/components/shared/file-upload-zone";
import type { AttachmentListItem } from "@/lib/attachments/types";
import { cn } from "@/lib/utils";
import type {
  ClientPlatformConnection,
  ClientProjectOpenTaskRow,
  ClientProjectRow,
} from "@/lib/queries/clients";
import type { ClientCredentialsResult } from "@/lib/credentials/types";
import type { ClientHourlyWorkSummary } from "@/lib/clients/hourly-billing";
import type { InteractionRow } from "@/lib/interactions/types";
import type { ClientUpdateRow } from "@/lib/updates/types";
import type { Client, ClientContact, ClientUser, TeamMember } from "@/lib/types";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "projects", label: "Projects" },
  { id: "updates", label: "Updates" },
  { id: "interactions", label: "Interactions" },
  { id: "files", label: "Files" },
  { id: "access", label: "Access" },
  { id: "history", label: "History" },
  { id: "marketing-brief", label: "Marketing Brief" },
  { id: "marketing", label: "Marketing" },
] as const;

type TabId = (typeof tabs)[number]["id"];

type ClientDetailTabsProps = {
  client: Client;
  agencyName: string | null;
  primaryContact: ClientContact | null;
  contacts: ClientContact[];
  lastInteractionAt: string | null;
  teamMembers: Pick<TeamMember, "id" | "name" | "email">[];
  projects: ClientProjectRow[];
  openTasksByProject: Record<string, ClientProjectOpenTaskRow[]>;
  updates: ClientUpdateRow[];
  interactions: InteractionRow[];
  historyPanel: React.ReactNode;
  marketingPanel: React.ReactNode;
  attachments: AttachmentListItem[];
  access: ClientCredentialsResult;
  portalUsers: ClientUser[];
  platformConnections: ClientPlatformConnection[];
  canViewMrr: boolean;
  hourlyWork?: ClientHourlyWorkSummary | null;
  isAdmin: boolean;
  currentTeamMemberId: string | null;
};

export function ClientDetailTabs({
  client,
  agencyName,
  primaryContact,
  contacts,
  lastInteractionAt,
  teamMembers,
  projects,
  openTasksByProject,
  updates,
  interactions,
  historyPanel,
  marketingPanel,
  attachments,
  access,
  portalUsers,
  platformConnections,
  canViewMrr,
  hourlyWork = null,
  isAdmin,
  currentTeamMemberId,
}: ClientDetailTabsProps) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const activeTab = (searchParams.get("tab") as TabId) || "overview";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {client?.name ?? "Client"}
            </h1>
            <AgencyBadge name={agencyName ?? null} />
          </div>
          {primaryContact?.job_title ? (
            <p className="text-sm text-muted-foreground">
              {primaryContact.job_title}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <RagDot status={client?.rag_status} />
          <StatusBadge status={client?.status} />
          <ClientActionsMenu
            clientId={client.id}
            status={client?.status}
            isAdmin={isAdmin}
          />
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((tab) => {
          const params = new URLSearchParams();
          if (tab.id !== "overview") {
            params.set("tab", tab.id);
          }

          if (tab.id === "marketing") {
            const marketingSub = searchParams.get("marketingSub");
            if (marketingSub) params.set("marketingSub", marketingSub);
            for (const key of ["range", "start", "end", "view"] as const) {
              const value = searchParams.get(key);
              if (value) params.set(key, value);
            }
          } else if (tab.id !== "overview" && searchParams.get("range")) {
            params.set("range", searchParams.get("range")!);
          }

          const href =
            tab.id === "overview"
              ? pathname
              : `${pathname}?${params.toString()}`;

          return (
            <Link
              key={tab.id}
              href={href}
              className={cn(
                "shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {activeTab === "overview" ? (
        <ClientOverviewTab
          client={client}
          agencyName={agencyName ?? null}
          contacts={contacts ?? []}
          lastInteractionAt={lastInteractionAt ?? null}
          teamMembers={teamMembers ?? []}
          portalUsers={portalUsers ?? []}
          platformConnections={platformConnections ?? []}
          canViewMrr={canViewMrr}
          hourlyWork={hourlyWork}
        />
      ) : null}

      {activeTab === "projects" ? (
        <ClientProjectsTab
          clientId={client.id}
          projects={projects ?? []}
          openTasksByProject={openTasksByProject}
        />
      ) : null}

      {activeTab === "updates" ? (
        <ClientUpdatesTab
          clientId={client.id}
          marketingChannels={client.marketing_channels}
          updates={updates ?? []}
          teamMembers={teamMembers ?? []}
        />
      ) : null}

      {activeTab === "interactions" ? (
        <ClientInteractionsTab
          clientId={client.id}
          contacts={contacts ?? []}
          interactions={interactions ?? []}
          currentTeamMemberId={currentTeamMemberId ?? null}
          isAdmin={isAdmin}
        />
      ) : null}

      {activeTab === "history" ? historyPanel : null}

      {activeTab === "marketing-brief" ? (
        <ClientMarketingBriefTab
          clientId={client.id}
          brief={client.marketing_brief}
        />
      ) : null}

      {activeTab === "marketing" ? (
        <div className="space-y-4">
          {client.report_slug?.trim() ? <ClientMarketingSubTabs /> : null}
          {marketingPanel}
        </div>
      ) : null}

      {activeTab === "files" ? (
        <FileUploadZone
          entityType="client"
          entityId={client.id}
          attachments={attachments ?? []}
        />
      ) : null}

      {activeTab === "access" ? (
        <ClientAccessTab clientId={client.id} access={access} />
      ) : null}
    </div>
  );
}
