import type { ChangeHistoryDiff } from "@/lib/change-history/types";
import { getChangeDiffs } from "@/lib/change-history/display";
import { getMarketingChannelLabel } from "@/lib/clients/overview-fields";
import { interactionTypeLabel } from "@/lib/interactions/display";
import type { ChangeAction, Json } from "@/lib/types";

export const ACTIVITY_EVENT_CATEGORIES = [
  "client",
  "contact",
  "project",
  "task",
  "interaction",
  "update",
  "milestone",
  "file",
  "portal",
] as const;

export type ActivityEventCategory = (typeof ACTIVITY_EVENT_CATEGORIES)[number];

export type ActivityEvent = {
  id: string;
  category: ActivityEventCategory;
  timestamp: string;
  actorId: string | null;
  actorName: string | null;
  title: string;
  description?: string | null;
  diffs?: ChangeHistoryDiff[];
};

export type ClientActivityLogFilters = {
  types?: ActivityEventCategory[];
  from?: string;
  to?: string;
  teamMemberId?: string;
};

export type ClientActivityLogPage = {
  entries: ActivityEvent[];
  totalCount: number;
  hasMore: boolean;
};

export const DEFAULT_CLIENT_ACTIVITY_PAGE_SIZE = 25;

export function normalizeHistoryEntityType(entityType: string) {
  return entityType.replace(/^(public|pm)\./, "");
}

export function matchesHistoryEntityType(
  entityType: string,
  ...candidates: string[]
) {
  const normalized = normalizeHistoryEntityType(entityType);
  return candidates.includes(normalized) || candidates.includes(entityType);
}

function recordLabel(
  values: Json | null,
  keys: string[] = ["title", "name", "email", "summary"],
  fallback = "Record",
) {
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return fallback;
  }

  const record = values as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return fallback;
}

type HistoryRow = {
  id: string;
  action: ChangeAction;
  entity_type: string;
  entity_id: string;
  changed_at: string;
  changed_by: string | null;
  changed_by_name: string | null;
  old_values: Json | null;
  new_values: Json | null;
};

export function mapClientChangeHistoryEvent(
  row: HistoryRow,
  context: {
    clientId: string;
    contactIds: Set<string>;
    projectIds: Set<string>;
    taskProjectNames: Map<string, string>;
    projectNames: Map<string, string>;
    milestoneTitles: Map<string, string>;
    portalEmails: Map<string, string>;
  },
): ActivityEvent | null {
  const diffs = getChangeDiffs(row.action, row.old_values, row.new_values);
  const base = {
    timestamp: row.changed_at,
    actorId: row.changed_by,
    actorName: row.changed_by_name,
    diffs: diffs.length > 0 ? diffs : undefined,
  };

  if (
    matchesHistoryEntityType(row.entity_type, "clients") &&
    row.entity_id === context.clientId
  ) {
    return {
      id: `history-${row.id}`,
      category: "client",
      title:
        row.action === "insert"
          ? "Client created"
          : row.action === "delete"
            ? "Client deleted"
            : "Client updated",
      ...base,
    };
  }

  if (
    matchesHistoryEntityType(row.entity_type, "client_contacts") &&
    context.contactIds.has(row.entity_id)
  ) {
    const name = recordLabel(row.new_values ?? row.old_values, [
      "first_name",
      "last_name",
      "email",
    ]);
    return {
      id: `history-${row.id}`,
      category: "contact",
      title:
        row.action === "insert"
          ? `Contact added: ${name}`
          : row.action === "delete"
            ? `Contact removed: ${name}`
            : `Contact updated: ${name}`,
      ...base,
    };
  }

  if (
    matchesHistoryEntityType(row.entity_type, "projects") &&
    context.projectIds.has(row.entity_id)
  ) {
    const name =
      context.projectNames.get(row.entity_id) ??
      recordLabel(row.new_values ?? row.old_values);
    return {
      id: `history-${row.id}`,
      category: "project",
      title:
        row.action === "insert"
          ? `Project created: ${name}`
          : row.action === "delete"
            ? `Project deleted: ${name}`
            : `Project updated: ${name}`,
      ...base,
    };
  }

  if (matchesHistoryEntityType(row.entity_type, "tasks")) {
    const title = recordLabel(row.new_values ?? row.old_values, ["title"]);
    const projectName = context.taskProjectNames.get(row.entity_id);
    return {
      id: `history-${row.id}`,
      category: "task",
      title:
        row.action === "insert"
          ? `Task created: ${title}`
          : row.action === "delete"
            ? `Task deleted: ${title}`
            : `Task updated: ${title}`,
      description: projectName ? `Project: ${projectName}` : null,
      ...base,
    };
  }

  if (matchesHistoryEntityType(row.entity_type, "milestones")) {
    const title =
      context.milestoneTitles.get(row.entity_id) ??
      recordLabel(row.new_values ?? row.old_values);
    const completedNow =
      row.action === "update" &&
      row.new_values &&
      typeof row.new_values === "object" &&
      !Array.isArray(row.new_values) &&
      row.new_values.completed === true &&
      row.old_values &&
      typeof row.old_values === "object" &&
      !Array.isArray(row.old_values) &&
      row.old_values.completed !== true;
    const approvedNow =
      row.action === "update" &&
      row.new_values &&
      typeof row.new_values === "object" &&
      !Array.isArray(row.new_values) &&
      row.new_values.approved_by_client === true &&
      row.old_values &&
      typeof row.old_values === "object" &&
      !Array.isArray(row.old_values) &&
      row.old_values.approved_by_client !== true;

    let eventTitle = `Milestone updated: ${title}`;
    if (row.action === "insert") eventTitle = `Milestone created: ${title}`;
    if (row.action === "delete") eventTitle = `Milestone deleted: ${title}`;
    if (completedNow) eventTitle = `Milestone completed: ${title}`;
    if (approvedNow) eventTitle = `Milestone approved: ${title}`;

    return {
      id: `history-${row.id}`,
      category: "milestone",
      title: eventTitle,
      ...base,
    };
  }

  if (matchesHistoryEntityType(row.entity_type, "client_portal_users")) {
    const email =
      context.portalEmails.get(row.entity_id) ??
      recordLabel(row.new_values ?? row.old_values, ["email"]);
    const revoked =
      row.action === "update" &&
      row.new_values &&
      typeof row.new_values === "object" &&
      !Array.isArray(row.new_values) &&
      row.new_values.is_active === false;

    return {
      id: `history-${row.id}`,
      category: "portal",
      title: revoked
        ? `Portal user revoked: ${email}`
        : row.action === "insert"
          ? `Portal user invited: ${email}`
          : `Portal user updated: ${email}`,
      ...base,
    };
  }

  return null;
}

export function mapInteractionActivityEvent(row: {
  id: string;
  type: string;
  summary: string;
  occurred_at: string;
  logged_by: string | null;
  logged_by_name: string | null;
}): ActivityEvent {
  return {
    id: `interaction-${row.id}`,
    category: "interaction",
    timestamp: row.occurred_at,
    actorId: row.logged_by,
    actorName: row.logged_by_name,
    title: `Interaction logged: ${interactionTypeLabel(row.type as never)} - ${row.summary}`,
  };
}

export function mapClientUpdateActivityEvent(row: {
  id: string;
  marketing_channel: string;
  summary: string;
  occurred_at: string;
  logged_by: string | null;
  logged_by_name: string | null;
}): ActivityEvent {
  return {
    id: `update-${row.id}`,
    category: "update",
    timestamp: row.occurred_at,
    actorId: row.logged_by,
    actorName: row.logged_by_name,
    title: `Update logged: ${getMarketingChannelLabel(row.marketing_channel)} - ${row.summary}`,
  };
}

export function mapAttachmentActivityEvent(row: {
  id: string;
  filename: string;
  created_at: string;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
}): ActivityEvent {
  return {
    id: `file-${row.id}`,
    category: "file",
    timestamp: row.created_at,
    actorId: row.uploaded_by,
    actorName: row.uploaded_by_name,
    title: `File uploaded: ${row.filename}`,
  };
}

export function mapPortalInviteActivityEvent(row: {
  id: string;
  email: string;
  invited_at: string;
}): ActivityEvent {
  return {
    id: `portal-invite-${row.id}`,
    category: "portal",
    timestamp: row.invited_at,
    actorId: null,
    actorName: null,
    title: `Portal user invited: ${row.email}`,
  };
}

export function applyActivityLogFilters(
  events: ActivityEvent[],
  filters: ClientActivityLogFilters,
): ActivityEvent[] {
  let filtered = events;

  if (filters.types?.length) {
    const allowed = new Set(filters.types);
    filtered = filtered.filter((event) => allowed.has(event.category));
  }

  if (filters.from) {
    const from = `${filters.from}T00:00:00.000Z`;
    filtered = filtered.filter((event) => event.timestamp >= from);
  }

  if (filters.to) {
    const to = `${filters.to}T23:59:59.999Z`;
    filtered = filtered.filter((event) => event.timestamp <= to);
  }

  if (filters.teamMemberId) {
    filtered = filtered.filter(
      (event) => event.actorId === filters.teamMemberId,
    );
  }

  return filtered.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}
