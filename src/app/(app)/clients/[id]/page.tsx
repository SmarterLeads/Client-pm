import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ClientDetailTabs } from "@/components/clients/client-detail-tabs";
import { ClientHistoryPanel } from "@/components/clients/client-history-panel";
import { ClientMarketingTab } from "@/components/clients/client-marketing-tab";
import { Skeleton } from "@/components/ui/skeleton";
import { getAttachmentsForEntity } from "@/lib/queries/attachments";
import { getTeamMember } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/roles";
import {
  getActiveTeamMembers,
  getClientById,
  getClientInteractions,
  getClientPlatformConnections,
  getClientPortalUsers,
  getClientProjects,
} from "@/lib/queries/clients";
import { getClientUpdates } from "@/lib/queries/client-updates";
import { clientInteractionFiltersSchema } from "@/lib/validations/interaction";
import { clientUpdateFiltersSchema } from "@/lib/validations/client-update";

type ClientDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    type?: string;
    from?: string;
    to?: string;
    channel?: string;
    loggedBy?: string;
    range?: string;
    start?: string;
    end?: string;
    view?: string;
    marketingSub?: string;
  }>;
};

export default async function ClientDetailPage({
  params,
  searchParams,
}: ClientDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;

  const interactionFiltersParsed = clientInteractionFiltersSchema.safeParse({
    type: query.type,
    from: query.from,
    to: query.to,
  });

  const interactionFilters = interactionFiltersParsed.success
    ? interactionFiltersParsed.data
    : {};

  const updateFiltersParsed = clientUpdateFiltersSchema.safeParse({
    from: query.from,
    to: query.to,
    channel: query.channel,
    loggedBy: query.loggedBy,
  });

  const updateFilters = updateFiltersParsed.success
    ? updateFiltersParsed.data
    : {};

  const result = await getClientById(id);

  if (!result) {
    notFound();
  }

  const { client, primaryContact, contacts, agencyName, lastInteractionAt } =
    result;

  const [teamMembers, projects, updates, interactions, attachments, portalUsers, platformConnections, teamMember] =
    await Promise.all([
      getActiveTeamMembers().catch(() => [] as Awaited<ReturnType<typeof getActiveTeamMembers>>),
      getClientProjects(id),
      getClientUpdates(id, updateFilters),
      getClientInteractions(id, interactionFilters),
      getAttachmentsForEntity("client", id).catch(() => [] as Awaited<ReturnType<typeof getAttachmentsForEntity>>),
      getClientPortalUsers(id),
      getClientPlatformConnections(id),
      getTeamMember(),
    ]);

  return (
    <div className="space-y-4">
      <Link
        href="/clients"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to clients
      </Link>

      <Suspense fallback={<DetailSkeleton />}>
        <ClientDetailTabs
          client={client}
          agencyName={agencyName ?? null}
          primaryContact={primaryContact ?? null}
          contacts={contacts ?? []}
          lastInteractionAt={lastInteractionAt ?? null}
          teamMembers={teamMembers ?? []}
          projects={projects ?? []}
          updates={updates ?? []}
          interactions={interactions ?? []}
          historyPanel={<ClientHistoryPanel clientId={id} />}
          marketingPanel={
            <ClientMarketingTab client={client} searchParams={query} />
          }
          attachments={attachments ?? []}
          portalUsers={portalUsers ?? []}
          platformConnections={platformConnections ?? []}
          canViewMrr={teamMember?.can_view_mrr ?? false}
          isAdmin={teamMember ? isAdmin(teamMember.role) : false}
          currentTeamMemberId={teamMember?.id ?? null}
        />
      </Suspense>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
