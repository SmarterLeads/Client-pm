import { formatContactName } from "@/lib/clients/contact-utils";
import {
  applyActivityLogFilters,
  mapAttachmentActivityEvent,
  mapClientChangeHistoryEvent,
  mapClientUpdateActivityEvent,
  mapInteractionActivityEvent,
  mapPortalInviteActivityEvent,
  type ActivityEvent,
  type ActivityEventCategory,
  type ClientActivityLogFilters,
} from "@/lib/clients/activity-log";
import {
  contactNameFromMap,
  loadContactNameMap,
} from "@/lib/interactions/contact-names";
import type { ChangeHistoryRow } from "@/lib/change-history/types";
import type {
  ClientInteractionFilters,
  InteractionRow,
} from "@/lib/interactions/types";
import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";
import type {
  ChangeAction,
  Client,
  ClientContact,
  ClientUser,
  Json,
  ProjectStatus,
  RagStatus,
  TeamMember,
} from "@/lib/types";
import type { ClientStatus } from "@/lib/pm/constants";

export type { InteractionRow as ClientInteractionRow } from "@/lib/interactions/types";

function startOfDay(isoDate: string) {
  const d = new Date(isoDate);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfDay(isoDate: string) {
  const d = new Date(isoDate);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export { formatContactName } from "@/lib/clients/contact-utils";

export type ClientListRow = {
  id: string;
  name: string;
  status: ClientStatus | null;
  rag_status: RagStatus | null;
  agency_name: string | null;
  account_manager: string | null;
  primary_contact: string | null;
  primary_contact_email: string | null;
  active_projects: number;
  last_interaction_at: string | null;
};

export type ClientListFilters = {
  q?: string;
  status?: ClientStatus;
  rag?: RagStatus;
  agency?: string;
  includeInactive?: boolean;
};

export type ClientsListPage = {
  clients: ClientListRow[];
  totalCount: number;
};

/** Shown on /clients when "Include inactive" is off. */
export const CLIENT_LIST_ACTIVE_STATUSES = ["active", "prospect"] as const;

export type ClientDetail = {
  client: Client;
  primaryContact: ClientContact | null;
  contacts: ClientContact[];
  accountManager: Pick<TeamMember, "id" | "name" | "email"> | null;
  agencyName: string | null;
  lastInteractionAt: string | null;
};

const DEFAULT_CLIENT_STATUS: ClientStatus = "prospect";
const DEFAULT_RAG_STATUS: RagStatus = "green";

function normalizeClientRow(client: Client): Client {
  return {
    ...client,
    name: client.name ?? "Unnamed client",
    status: client.status ?? DEFAULT_CLIENT_STATUS,
    rag_status: client.rag_status ?? DEFAULT_RAG_STATUS,
    pm_notes: client.pm_notes ?? null,
    account_manager_id: client.account_manager_id ?? null,
    marketing_channels: client.marketing_channels ?? [],
    address_country: client.address_country ?? "Canada",
  };
}

export type ClientPlatformConnection = {
  platform: string;
  external_account_id: string | null;
};

export async function getClientPlatformConnections(
  clientId: string,
): Promise<ClientPlatformConnection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_connections")
    .select("platform, external_account_id")
    .eq("client_id", clientId);

  if (error) {
    console.error("[getClientPlatformConnections]", error.message);
    return [];
  }

  return data ?? [];
}

function mapClientListRows(
  data: Array<{
    id: string | null;
    name: string | null;
    status: ClientListRow["status"] | string | null;
    rag_status: ClientListRow["rag_status"] | string | null;
    agency_name: string | null;
    account_manager: string | null;
    primary_contact: string | null;
    primary_contact_email: string | null;
    active_projects: number | null;
    last_interaction_at: string | null;
  }>,
): ClientListRow[] {
  return data
    .filter((row): row is ClientListRow & { id: string; name: string } =>
      Boolean(row.id && row.name),
    )
    .map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status as ClientListRow["status"],
      rag_status: row.rag_status as ClientListRow["rag_status"],
      agency_name: row.agency_name,
      account_manager: row.account_manager,
      primary_contact: row.primary_contact,
      primary_contact_email: row.primary_contact_email,
      active_projects: row.active_projects ?? 0,
      last_interaction_at: row.last_interaction_at,
    }));
}

export async function getClientsList(
  filters: ClientListFilters = {},
): Promise<ClientsListPage> {
  const supabase = await createClient();

  let agencyClientIds: string[] | null = null;

  if (filters.agency) {
    const { data: scopedClients, error: scopeError } = await supabase
      .from("clients")
      .select("id")
      .eq("agency_id", filters.agency);

    if (scopeError) {
      throw new Error(scopeError.message);
    }

    agencyClientIds = (scopedClients ?? []).map((client) => client.id);
    if (agencyClientIds.length === 0) {
      return { clients: [], totalCount: 0 };
    }
  }

  function applyListFilters<
    T extends {
      in: (column: string, values: string[]) => T;
      eq: (column: string, value: string) => T;
      ilike: (column: string, pattern: string) => T;
    },
  >(query: T): T {
    let next = query;

    if (agencyClientIds) {
      next = next.in("id", agencyClientIds);
    }

    if (filters.status) {
      next = next.eq("status", filters.status);
    } else if (!filters.includeInactive) {
      next = next.in("status", [...CLIENT_LIST_ACTIVE_STATUSES]);
    }

    if (filters.rag) {
      next = next.eq("rag_status", filters.rag);
    }

    if (filters.q?.trim()) {
      next = next.ilike("name", `%${filters.q.trim()}%`);
    }

    return next;
  }

  let countQuery = pm(supabase)
    .from("v_client_health")
    .select("id", { count: "exact", head: true });

  countQuery = applyListFilters(countQuery);

  let query = pm(supabase)
    .from("v_client_health")
    .select(
      "id, name, status, rag_status, agency_name, account_manager, primary_contact, primary_contact_email, active_projects, last_interaction_at",
    )
    .order("name", { ascending: true })
    .order("id", { ascending: true });

  query = applyListFilters(query);

  const [{ count, error: countError }, { data, error }] = await Promise.all([
    countQuery,
    query,
  ]);

  if (countError) {
    console.error("[getClientsList count]", countError.message);
  }

  if (error) {
    throw new Error(error.message);
  }

  const clients = mapClientListRows(data ?? []);

  return { clients, totalCount: count ?? clients.length };
}

export async function getClientContacts(
  clientId: string,
): Promise<ClientContact[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_contacts")
    .select("*")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .order("is_primary", { ascending: false })
    .order("first_name", { ascending: true });

  if (error) {
    console.error("[getClientContacts]", error.message);
    return [];
  }

  return data ?? [];
}

export async function getClientById(id: string): Promise<ClientDetail | null> {
  console.log("[getClientById] querying id:", id);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  console.log("[getClientById] result:", JSON.stringify(data));
  console.log("[getClientById] error:", JSON.stringify(error));

  if (error) {
    console.error("[getClientById] client query:", error.message);
    return null;
  }

  if (!data) {
    try {
      const { createServiceClient } = await import("@/lib/supabase/service");
      const service = createServiceClient();
      const { data: serviceRow, error: serviceError } = await service
        .from("clients")
        .select("id, name, agency_id, status, created_at")
        .eq("id", id)
        .maybeSingle();

      console.log(
        "[getClientById] service-role row (RLS bypass):",
        JSON.stringify(serviceRow),
      );
      console.log(
        "[getClientById] service-role error:",
        JSON.stringify(serviceError),
      );
    } catch (serviceCheckErr) {
      console.error("[getClientById] service-role check failed:", serviceCheckErr);
    }

    return null;
  }

  const client = data;

  const contacts = await getClientContacts(id);
  const primaryContact =
    contacts.find((contact) => contact.is_primary) ?? contacts[0] ?? null;

  let accountManager: Pick<TeamMember, "id" | "name" | "email"> | null = null;

  if (client.account_manager_id) {
    const { data: manager, error: managerError } = await pm(supabase)
      .from("team_members")
      .select("id, name, email")
      .eq("id", client.account_manager_id)
      .maybeSingle();

    if (managerError) {
      console.error("[getClientById] account manager:", managerError.message);
    } else {
      accountManager = manager;
    }
  }

  const { data: health, error: healthError } = await pm(supabase)
    .from("v_client_health")
    .select("last_interaction_at, agency_name")
    .eq("id", id)
    .maybeSingle();

  if (healthError) {
    console.error("[getClientById] v_client_health:", healthError.message);
  }

  return {
    client: normalizeClientRow(client),
    primaryContact,
    contacts,
    accountManager,
    agencyName: health?.agency_name ?? null,
    lastInteractionAt: health?.last_interaction_at ?? null,
  };
}

export async function getActiveTeamMembers(): Promise<
  Pick<TeamMember, "id" | "name" | "email">[]
> {
  const supabase = await createClient();
  const { data, error } = await pm(supabase)
    .from("team_members")
    .select("id, name, email")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export type ClientProjectRow = {
  id: string;
  name: string;
  status: ProjectStatus;
  rag_status: RagStatus;
  due_date: string | null;
  owner_name: string | null;
  total_tasks: number;
  done_tasks: number;
};

export async function getClientProjects(
  clientId: string,
): Promise<ClientProjectRow[]> {
  const supabase = await createClient();

  const { data: projects, error } = await pm(supabase)
    .from("projects")
    .select(
      `
      id,
      name,
      status,
      rag_status,
      due_date,
      owner:team_members(name),
      tasks(id, status)
    `,
    )
    .eq("client_id", clientId)
    .order("name", { ascending: true });

  if (error) {
    console.error("[getClientProjects]", error.message);
    return [];
  }

  return (projects ?? []).map((project) => {
    const tasks = project.tasks ?? [];
    const done_tasks = tasks.filter((t) => t?.status === "done").length;

    return {
      id: project.id,
      name: project.name ?? "Untitled project",
      status: project.status ?? "planned",
      rag_status: project.rag_status ?? "green",
      due_date: project.due_date ?? null,
      owner_name: project.owner?.name ?? null,
      total_tasks: tasks.length,
      done_tasks,
    };
  });
}

export async function getClientInteractions(
  clientId: string,
  filters: ClientInteractionFilters = {},
): Promise<InteractionRow[]> {
  const supabase = await createClient();

  let query = pm(supabase)
    .from("interactions")
    .select(
      `
      id,
      type,
      channel,
      summary,
      body,
      occurred_at,
      contact_id,
      logged_by,
      logger:team_members(name)
    `,
    )
    .eq("client_id", clientId)
    .order("occurred_at", { ascending: false });

  if (filters.type) {
    query = query.eq("type", filters.type);
  }

  if (filters.from) {
    query = query.gte("occurred_at", startOfDay(filters.from));
  }

  if (filters.to) {
    query = query.lte("occurred_at", endOfDay(filters.to));
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getClientInteractions]", error.message);
    return [];
  }

  const rows = data ?? [];
  const contactMap = await loadContactNameMap(
    supabase,
    rows.map((row) => row.contact_id).filter((id): id is string => Boolean(id)),
  );

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    channel: row.channel,
    summary: row.summary,
    body: row.body,
    occurred_at: row.occurred_at,
    logged_by: row.logged_by,
    logged_by_name: row.logger?.name ?? null,
    contact_id: row.contact_id,
    contact_name: contactNameFromMap(row.contact_id, contactMap),
  }));
}

export type { ChangeHistoryRow as ClientHistoryRow } from "@/lib/change-history/types";

export type {
  ActivityEvent,
  ActivityEventCategory,
  ClientActivityLogFilters,
} from "@/lib/clients/activity-log";

const CLIENT_HISTORY_ENTITY_TYPES = [
  "clients",
  "interactions",
  "client_contacts",
  "projects",
] as const;

export async function getClientActivityLog(
  clientId: string,
  filters: ClientActivityLogFilters = {},
): Promise<ActivityEvent[]> {
  try {
    const supabase = await createClient();

    const [
      contactsRes,
      projectsRes,
      portalUsersRes,
      interactionsRes,
      updatesRes,
      clientAttachmentsRes,
    ] = await Promise.all([
      supabase.from("client_contacts").select("id").eq("client_id", clientId),
      pm(supabase).from("projects").select("id, name").eq("client_id", clientId),
      pm(supabase)
        .from("client_portal_users")
        .select("id, email, invited_at, is_active")
        .eq("client_id", clientId),
      pm(supabase)
        .from("interactions")
        .select(
          `
          id,
          type,
          summary,
          occurred_at,
          logged_by,
          logger:team_members(name)
        `,
        )
        .eq("client_id", clientId),
      pm(supabase)
        .from("client_updates")
        .select("id, marketing_channel, summary, occurred_at, logged_by")
        .eq("client_id", clientId),
      pm(supabase)
        .from("attachments")
        .select(
          `
          id,
          filename,
          created_at,
          uploaded_by,
          uploader:team_members(name)
        `,
        )
        .eq("entity_type", "client")
        .eq("entity_id", clientId),
    ]);

    const contactIds = (contactsRes.data ?? []).map((row) => row.id);
    const projects = projectsRes.data ?? [];
    const projectIds = projects.map((row) => row.id);
    const projectNames = new Map(projects.map((row) => [row.id, row.name]));

    const [tasksRes, milestonesRes] =
      projectIds.length > 0
        ? await Promise.all([
            pm(supabase)
              .from("tasks")
              .select("id, title, project_id, project:projects(name)")
              .in("project_id", projectIds),
            pm(supabase)
              .from("milestones")
              .select("id, title, project_id")
              .in("project_id", projectIds),
          ])
        : [{ data: [] }, { data: [] }];

    const clientTasks = tasksRes.data ?? [];
    const taskIds = clientTasks.map((row) => row.id);
    const taskProjectNames = new Map(
      clientTasks.map((row) => [row.id, row.project?.name ?? "Unknown project"]),
    );

    const clientMilestones = milestonesRes.data ?? [];
    const milestoneIds = clientMilestones.map((row) => row.id);
    const milestoneTitles = new Map(
      clientMilestones.map((row) => [row.id, row.title]),
    );

    const portalUsers = portalUsersRes.data ?? [];
    const portalUserIds = portalUsers.map((row) => row.id);
    const portalEmails = new Map(portalUsers.map((row) => [row.id, row.email]));

    let projectAttachments: {
      id: string;
      filename: string;
      created_at: string;
      uploaded_by: string | null;
      uploader: { name: string } | null;
    }[] = [];

    if (projectIds.length > 0) {
      const { data } = await pm(supabase)
        .from("attachments")
        .select(
          `
          id,
          filename,
          created_at,
          uploaded_by,
          uploader:team_members(name)
        `,
        )
        .eq("entity_type", "project")
        .in("entity_id", projectIds);

      projectAttachments = data ?? [];
    }

    const contactIdSet = new Set(contactIds);
    const projectIdSet = new Set(projectIds);
    const taskIdSet = new Set(taskIds);
    const milestoneIdSet = new Set(milestoneIds);

    const historyEntityIds = [
      clientId,
      ...contactIds,
      ...projectIds,
      ...taskIds,
      ...milestoneIds,
      ...portalUserIds,
    ];

    let historyRows: {
      id: string;
      action: ChangeAction;
      entity_type: string;
      entity_id: string;
      changed_at: string;
      changed_by: string | null;
      old_values: Json | null;
      new_values: Json | null;
      changer: { name: string } | null;
    }[] = [];

    if (historyEntityIds.length > 0) {
      const { data, error } = await pm(supabase)
        .from("change_history")
        .select(
          `
          id,
          action,
          entity_type,
          entity_id,
          changed_at,
          changed_by,
          old_values,
          new_values,
          changer:team_members(name)
        `,
        )
        .in("entity_id", historyEntityIds)
        .order("changed_at", { ascending: false })
        .limit(500);

      if (error) {
        console.error("[getClientActivityLog] change_history:", error.message);
      } else {
        historyRows = data ?? [];
      }
    }

    const historyContext = {
      clientId,
      contactIds: contactIdSet,
      projectIds: projectIdSet,
      taskProjectNames,
      projectNames,
      milestoneTitles,
      portalEmails,
    };

    const portalInviteHistoryIds = new Set(
      historyRows
        .filter(
          (row) =>
            row.action === "insert" &&
            row.entity_type.replace(/^(public|pm)\./, "") ===
              "client_portal_users",
        )
        .map((row) => row.entity_id),
    );

    const events: ActivityEvent[] = [];

    for (const row of historyRows) {
      if (
        row.entity_type.replace(/^(public|pm)\./, "") === "tasks" &&
        !taskIdSet.has(row.entity_id)
      ) {
        continue;
      }

      if (
        row.entity_type.replace(/^(public|pm)\./, "") === "milestones" &&
        !milestoneIdSet.has(row.entity_id)
      ) {
        continue;
      }

      const mapped = mapClientChangeHistoryEvent(
        {
          id: row.id,
          action: row.action,
          entity_type: row.entity_type,
          entity_id: row.entity_id,
          changed_at: row.changed_at,
          changed_by: row.changed_by,
          changed_by_name: row.changer?.name ?? null,
          old_values: row.old_values,
          new_values: row.new_values,
        },
        historyContext,
      );

      if (mapped) events.push(mapped);
    }

    for (const row of interactionsRes.data ?? []) {
      events.push(
        mapInteractionActivityEvent({
          id: row.id,
          type: row.type,
          summary: row.summary,
          occurred_at: row.occurred_at,
          logged_by: row.logged_by,
          logged_by_name: row.logger?.name ?? null,
        }),
      );
    }

    const updateLoggerIds = [
      ...new Set(
        (updatesRes.data ?? [])
          .map((row) => row.logged_by)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const updateLoggerNames = new Map<string, string>();
    if (updateLoggerIds.length > 0) {
      const { data: loggers } = await pm(supabase)
        .from("team_members")
        .select("id, name")
        .in("id", updateLoggerIds);
      for (const logger of loggers ?? []) {
        updateLoggerNames.set(logger.id, logger.name);
      }
    }

    for (const row of updatesRes.data ?? []) {
      events.push(
        mapClientUpdateActivityEvent({
          id: row.id,
          marketing_channel: row.marketing_channel,
          summary: row.summary,
          occurred_at: row.occurred_at,
          logged_by: row.logged_by,
          logged_by_name: row.logged_by
            ? (updateLoggerNames.get(row.logged_by) ?? null)
            : null,
        }),
      );
    }

    for (const row of [...(clientAttachmentsRes.data ?? []), ...projectAttachments]) {
      events.push(
        mapAttachmentActivityEvent({
          id: row.id,
          filename: row.filename,
          created_at: row.created_at,
          uploaded_by: row.uploaded_by,
          uploaded_by_name: row.uploader?.name ?? null,
        }),
      );
    }

    for (const row of portalUsers) {
      if (!portalInviteHistoryIds.has(row.id)) {
        events.push(mapPortalInviteActivityEvent(row));
      }
    }

    return applyActivityLogFilters(events, filters);
  } catch (err) {
    console.error("[getClientActivityLog]", err);
    return [];
  }
}

/** @deprecated Use getClientActivityLog instead. */
export async function getClientHistory(
  clientId: string,
): Promise<ChangeHistoryRow[]> {
  try {
    const supabase = await createClient();

    const [interactionsRes, contactsRes, projectsRes] = await Promise.all([
      pm(supabase).from("interactions").select("id").eq("client_id", clientId),
      supabase.from("client_contacts").select("id").eq("client_id", clientId),
      pm(supabase).from("projects").select("id").eq("client_id", clientId),
    ]);

    if (interactionsRes.error) {
      console.error("[getClientHistory] interactions:", interactionsRes.error.message);
    }
    if (contactsRes.error) {
      console.error("[getClientHistory] contacts:", contactsRes.error.message);
    }
    if (projectsRes.error) {
      console.error("[getClientHistory] projects:", projectsRes.error.message);
    }

    const entityIds = [
      clientId,
      ...(interactionsRes.data ?? []).map((row) => row.id),
      ...(contactsRes.data ?? []).map((row) => row.id),
      ...(projectsRes.data ?? []).map((row) => row.id),
    ];

    const { data, error } = await pm(supabase)
      .from("change_history")
      .select(
        `
      id,
      action,
      entity_type,
      entity_id,
      changed_at,
      old_values,
      new_values,
      changer:team_members(name)
    `,
      )
      .in("entity_id", entityIds)
      .in("entity_type", [...CLIENT_HISTORY_ENTITY_TYPES])
      .order("changed_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[getClientHistory] change_history:", error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      changed_at: row.changed_at,
      changed_by_name: row.changer?.name ?? null,
      old_values: row.old_values,
      new_values: row.new_values,
    }));
  } catch (err) {
    console.error("[getClientHistory]", err);
    return [];
  }
}

export async function getClientPortalUsers(
  clientId: string,
): Promise<ClientUser[]> {
  const supabase = await createClient();

  const { data, error } = await pm(supabase)
    .from("client_portal_users")
    .select("*")
    .eq("client_id", clientId)
    .order("invited_at", { ascending: false });

  if (error) {
    console.error("[getClientPortalUsers]", error.message);
    return [];
  }
  return data ?? [];
}
