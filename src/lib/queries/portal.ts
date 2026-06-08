import type {
  ClientInteractionFilters,
  InteractionRow,
} from "@/lib/interactions/types";
import type {
  PortalMilestoneRow,
  PortalProjectCard,
  PortalProjectDetail,
  PortalProjectListRow,
  PortalSectionWithTasks,
  PortalTaskRow,
  PortalUpcomingMilestone,
} from "@/lib/portal/types";
import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";

const ACTIVE_PROJECT_STATUSES = ["planned", "active", "on_hold"] as const;

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

function addDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function getPortalActiveProjects(): Promise<PortalProjectCard[]> {
  const supabase = await createClient();

  const { data, error } = await pm(supabase)
    .from("projects")
    .select("id, name, status, rag_status, due_date")
    .in("status", [...ACTIVE_PROJECT_STATUSES])
    .order("name");

  if (error) throw new Error(error.message);

  return data ?? [];
}

export async function getPortalUpcomingMilestones(): Promise<
  PortalUpcomingMilestone[]
> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const horizon = addDaysIso(30);

  const { data, error } = await pm(supabase)
    .from("milestones")
    .select(
      `
      id,
      title,
      target_date,
      completed,
      project_id,
      project:projects(name)
    `,
    )
    .eq("completed", false)
    .not("target_date", "is", null)
    .gte("target_date", today)
    .lte("target_date", horizon)
    .order("target_date", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter(
      (row): row is typeof row & { target_date: string; project_id: string } =>
        Boolean(row.target_date && row.project_id),
    )
    .map((row) => ({
      id: row.id,
      title: row.title,
      target_date: row.target_date,
      completed: row.completed,
      project_id: row.project_id,
      project_name: row.project?.name ?? "—",
    }));
}

export async function getPortalInteractions(
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
      occurred_at
    `,
    )
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

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    channel: row.channel,
    summary: row.summary,
    body: row.body,
    occurred_at: row.occurred_at,
    logged_by_name: null,
    contact_name: null,
  }));
}

export async function getPortalRecentInteractions(
  limit = 5,
): Promise<InteractionRow[]> {
  const supabase = await createClient();

  const { data, error } = await pm(supabase)
    .from("interactions")
    .select(
      `
      id,
      type,
      channel,
      summary,
      body,
      occurred_at
    `,
    )
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    channel: row.channel,
    summary: row.summary,
    body: row.body,
    occurred_at: row.occurred_at,
    logged_by_name: null,
    contact_name: null,
  }));
}

export async function getPortalProjectsList(): Promise<PortalProjectListRow[]> {
  const supabase = await createClient();

  const { data, error } = await pm(supabase)
    .from("projects")
    .select(
      `
      id,
      name,
      status,
      rag_status,
      due_date,
      milestones(id, completed)
    `,
    )
    .order("name");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const milestones = row.milestones ?? [];
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      rag_status: row.rag_status,
      due_date: row.due_date,
      total_milestones: milestones.length,
      completed_milestones: milestones.filter((m) => m.completed).length,
    };
  });
}

export async function getPortalProjectById(
  projectId: string,
): Promise<PortalProjectDetail | null> {
  const supabase = await createClient();

  const { data, error } = await pm(supabase)
    .from("projects")
    .select("id, name, status, rag_status, due_date, description")
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getPortalProjectMilestones(
  projectId: string,
): Promise<PortalMilestoneRow[]> {
  const supabase = await createClient();

  const { data, error } = await pm(supabase)
    .from("milestones")
    .select("id, title, target_date, completed, approved_by_client")
    .eq("project_id", projectId)
    .order("target_date", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPortalProjectTasksBySection(
  projectId: string,
): Promise<PortalSectionWithTasks[]> {
  const supabase = await createClient();

  const [sectionsRes, tasksRes] = await Promise.all([
    pm(supabase)
      .from("project_sections")
      .select("id, name, display_order")
      .eq("project_id", projectId)
      .order("display_order"),
    pm(supabase)
      .from("tasks")
      .select("id, title, status, section_id")
      .eq("project_id", projectId)
      .is("parent_task_id", null)
      .neq("status", "cancelled")
      .order("due_date", { ascending: true, nullsFirst: false }),
  ]);

  if (sectionsRes.error) throw new Error(sectionsRes.error.message);
  if (tasksRes.error) throw new Error(tasksRes.error.message);

  const sections = sectionsRes.data ?? [];
  const tasks = tasksRes.data ?? [];

  const sectionMap = new Map<string, PortalSectionWithTasks>();
  for (const section of sections) {
    sectionMap.set(section.id, {
      id: section.id,
      name: section.name,
      display_order: section.display_order,
      tasks: [],
    });
  }

  const unsectioned: PortalTaskRow[] = [];

  for (const task of tasks) {
    const row: PortalTaskRow = {
      id: task.id,
      title: task.title,
      status: task.status,
      section_id: task.section_id,
    };

    if (task.section_id && sectionMap.has(task.section_id)) {
      sectionMap.get(task.section_id)!.tasks.push(row);
    } else {
      unsectioned.push(row);
    }
  }

  const result = Array.from(sectionMap.values()).sort(
    (a, b) => a.display_order - b.display_order,
  );

  if (unsectioned.length > 0) {
    result.push({
      id: "unsectioned",
      name: "Other",
      display_order: 9999,
      tasks: unsectioned,
    });
  }

  return result;
}
