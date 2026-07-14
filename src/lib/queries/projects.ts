import {
  clientNameFromMap,
  loadClientNameMap,
} from "@/lib/clients/client-names";
import { toProjectListMember } from "@/lib/projects/members";
import { getProjectTemplateName } from "@/lib/queries/templates";
import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  ChangeAction,
  Milestone,
  Project,
  ProjectMember,
  ProjectSection,
  ProjectStatus,
  RagStatus,
  TaskPriority,
  TaskStatus,
  TeamMember,
} from "@/lib/types";
import type { Database } from "@/lib/types/database";

export type ProjectListMember = Pick<TeamMember, "id" | "name" | "avatar_url">;

export type ProjectListRow = {
  id: string;
  name: string;
  client_id: string;
  client_name: string;
  status: ProjectStatus;
  rag_status: RagStatus;
  members: ProjectListMember[];
  total_tasks: number;
  done_tasks: number;
};

export type ProjectListFilters = {
  q?: string;
  status?: ProjectStatus;
  client?: string;
  member?: string;
};

export type SelectOption = { id: string; name: string };

export type ProjectTaskRow = {
  id: string;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  section_id: string | null;
  due_date: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  assignee_avatar_url: string | null;
  subtask_count: number;
  comment_count: number;
  is_recurring: boolean;
};

export type ProjectDetail = {
  project: Project;
  client_name: string;
  owner_name: string | null;
  /** Pre-members model: show owner in header when project_members is empty. */
  legacy_owner: ProjectListMember | null;
  template_name: string | null;
};

export type ProjectHealth = {
  total_tasks: number;
  done_tasks: number;
  overdue_tasks: number;
  estimated_hours: number;
  logged_hours: number;
  days_remaining: number | null;
};

export type ProjectMemberRow = ProjectMember & {
  team_member: Pick<TeamMember, "id" | "name" | "email" | "avatar_url">;
};

export type ActivityRow = {
  id: string;
  action: ChangeAction;
  entity_type: string;
  entity_id: string;
  changed_at: string;
  changed_by_name: string | null;
  old_values: Database["pm"]["Tables"]["change_history"]["Row"]["old_values"];
  new_values: Database["pm"]["Tables"]["change_history"]["Row"]["new_values"];
};

export async function getProjectFilterOptions(): Promise<{
  clients: SelectOption[];
  members: SelectOption[];
}> {
  const supabase = await createClient();

  const [clientsRes, membersRes] = await Promise.all([
    supabase.from("clients").select("id, name").order("name"),
    pm(supabase)
      .from("team_members")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
  ]);

  if (clientsRes.error) throw new Error(clientsRes.error.message);
  if (membersRes.error) throw new Error(membersRes.error.message);

  return {
    clients: clientsRes.data ?? [],
    members: membersRes.data ?? [],
  };
}

export async function getClientsForSelect(): Promise<SelectOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getProjectsForSelect(): Promise<SelectOption[]> {
  const supabase = await createClient();
  const { data, error } = await pm(supabase)
    .from("projects")
    .select("id, name")
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getProjectsForSelectByClient(
  clientId: string,
): Promise<SelectOption[]> {
  const supabase = await createClient();
  const { data, error } = await pm(supabase)
    .from("projects")
    .select("id, name")
    .eq("client_id", clientId)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getTeamMembersForSelect(): Promise<
  Pick<TeamMember, "id" | "name" | "email" | "avatar_url">[]
> {
  const supabase = await createClient();
  const { data, error } = await pm(supabase)
    .from("team_members")
    .select("id, name, email, avatar_url")
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getProjectsList(
  filters: ProjectListFilters = {},
): Promise<ProjectListRow[]> {
  const supabase = await createClient();

  let projectIdsForMember: string[] | null = null;
  if (filters.member) {
    const { data: memberRows, error: memberError } = await pm(supabase)
      .from("project_members")
      .select("project_id")
      .eq("team_member_id", filters.member);

    if (memberError) throw new Error(memberError.message);
    projectIdsForMember = (memberRows ?? []).map((row) => row.project_id);
    if (projectIdsForMember.length === 0) return [];
  }

  let query = pm(supabase)
    .from("projects")
    .select(
      `
      id,
      name,
      client_id,
      status,
      rag_status,
      owner_id,
      owner:team_members(id, name, avatar_url),
      tasks(id, status)
    `,
    )
    .order("name", { ascending: true });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.client) {
    query = query.eq("client_id", filters.client);
  }
  if (projectIdsForMember) {
    query = query.in("id", projectIdsForMember);
  }
  if (filters.q?.trim()) {
    query = query.ilike("name", `%${filters.q.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const clientNameMap = await loadClientNameMap(
    supabase,
    rows.map((row) => row.client_id),
  );

  const projectIds = rows.map((row) => row.id);
  const membersByProject = new Map<string, ProjectListMember[]>();

  if (projectIds.length > 0) {
    const { data: memberRows, error: membersError } = await pm(supabase)
      .from("project_members")
      .select("project_id, team_member:team_members(id, name, avatar_url)")
      .in("project_id", projectIds);

    if (membersError) throw new Error(membersError.message);

    for (const row of memberRows ?? []) {
      const member = row.team_member;
      if (!member) continue;
      const list = membersByProject.get(row.project_id) ?? [];
      list.push({
        id: member.id,
        name: member.name,
        avatar_url: member.avatar_url,
      });
      membersByProject.set(row.project_id, list);
    }
  }

  return rows.map((row) => {
    const tasks = row.tasks ?? [];
    const done_tasks = tasks.filter((t) => t.status === "done").length;
    const members = membersByProject.get(row.id) ?? [];
    const legacyOwner = toProjectListMember(row.owner);

    return {
      id: row.id,
      name: row.name,
      client_id: row.client_id,
      client_name: clientNameFromMap(row.client_id, clientNameMap),
      status: row.status,
      rag_status: row.rag_status,
      members:
        members.length > 0
          ? members
          : legacyOwner
            ? [legacyOwner]
            : [],
      total_tasks: tasks.length,
      done_tasks,
    };
  });
}

export async function getProjectById(
  id: string,
): Promise<ProjectDetail | null> {
  const supabase = await createClient();

  const { data, error } = await pm(supabase)
    .from("projects")
    .select(
      `
      *,
      owner:team_members(id, name, avatar_url)
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const clientNameMap = await loadClientNameMap(supabase, [data.client_id]);
  const templateName = await getProjectTemplateName(data.template_id);
  const legacyOwner = toProjectListMember(data.owner);

  return {
    project: {
      id: data.id,
      name: data.name,
      client_id: data.client_id,
      owner_id: data.owner_id ?? null,
      description: data.description,
      status: data.status,
      rag_status: data.rag_status,
      start_date: data.start_date,
      due_date: data.due_date ?? null,
      template_id: data.template_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    },
    client_name: clientNameFromMap(data.client_id, clientNameMap),
    owner_name: data.owner?.name ?? null,
    legacy_owner: legacyOwner,
    template_name: templateName,
  };
}

export async function getProjectSections(
  projectId: string,
): Promise<ProjectSection[]> {
  const supabase = await createClient();
  const { data, error } = await pm(supabase)
    .from("project_sections")
    .select("*")
    .eq("project_id", projectId)
    .order("display_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getProjectTasks(
  projectId: string,
): Promise<ProjectTaskRow[]> {
  const supabase = await createClient();

  const [tasksRes, subtasksRes] = await Promise.all([
    pm(supabase)
      .from("tasks")
      .select(
        `
        id,
        title,
        priority,
        status,
        section_id,
        due_date,
        assignee_id,
        is_recurring,
        assignee:team_members(name, avatar_url),
        comments:task_comments(id)
      `,
      )
      .eq("project_id", projectId)
      .is("parent_task_id", null)
      .order("created_at", { ascending: true }),
    pm(supabase)
      .from("tasks")
      .select("parent_task_id")
      .eq("project_id", projectId)
      .not("parent_task_id", "is", null),
  ]);

  if (tasksRes.error) throw new Error(tasksRes.error.message);
  if (subtasksRes.error) throw new Error(subtasksRes.error.message);

  const subtaskCountByParent = new Map<string, number>();
  for (const subtask of subtasksRes.data ?? []) {
    if (!subtask.parent_task_id) continue;
    subtaskCountByParent.set(
      subtask.parent_task_id,
      (subtaskCountByParent.get(subtask.parent_task_id) ?? 0) + 1,
    );
  }

  return (tasksRes.data ?? []).map((task) => ({
    id: task.id,
    title: task.title,
    priority: task.priority,
    status: task.status,
    section_id: task.section_id,
    due_date: task.due_date,
    assignee_id: task.assignee_id,
    assignee_name: task.assignee?.name ?? null,
    assignee_avatar_url: task.assignee?.avatar_url ?? null,
    subtask_count: subtaskCountByParent.get(task.id) ?? 0,
    comment_count: task.comments?.length ?? 0,
    is_recurring: task.is_recurring,
  }));
}

export async function getProjectMilestones(
  projectId: string,
): Promise<Milestone[]> {
  const supabase = await createClient();
  const { data, error } = await pm(supabase)
    .from("milestones")
    .select("*")
    .eq("project_id", projectId)
    .order("target_date", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getProjectMembers(
  projectId: string,
): Promise<ProjectMemberRow[]> {
  const supabase = await createClient();

  const { data, error } = await pm(supabase)
    .from("project_members")
    .select(
      `
      *,
      team_member:team_members(id, name, email, avatar_url)
    `,
    )
    .eq("project_id", projectId)
    .order("joined_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter(
      (row): row is typeof row & {
        team_member: NonNullable<typeof row.team_member> & { id: string };
      } => Boolean(row.team_member?.id),
    )
    .map((row) => ({
      id: row.id,
      project_id: row.project_id,
      team_member_id: row.team_member_id,
      role: row.role,
      joined_at: row.joined_at,
      team_member: row.team_member,
    }));
}

export async function getProjectHealth(
  projectId: string,
  dueDate: string | null,
): Promise<ProjectHealth> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: tasks, error: tasksError } = await pm(supabase)
    .from("tasks")
    .select("id, status, due_date, estimated_hours")
    .eq("project_id", projectId)
    .is("parent_task_id", null);

  if (tasksError) throw new Error(tasksError.message);

  const taskList = tasks ?? [];
  const taskIds = taskList.map((t) => t.id);

  let loggedMinutes = 0;
  if (taskIds.length > 0) {
    const { data: timeEntries, error: timeError } = await pm(supabase)
      .from("time_entries")
      .select("duration_minutes")
      .in("task_id", taskIds);

    if (timeError) throw new Error(timeError.message);
    loggedMinutes = (timeEntries ?? []).reduce(
      (sum, e) => sum + e.duration_minutes,
      0,
    );
  }

  const done_tasks = taskList.filter((t) => t.status === "done").length;
  const overdue_tasks = taskList.filter(
    (t) =>
      t.status !== "done" &&
      t.status !== "cancelled" &&
      t.due_date &&
      t.due_date < today,
  ).length;
  const estimated_hours = taskList.reduce(
    (sum, t) => sum + (t.estimated_hours ?? 0),
    0,
  );

  let days_remaining: number | null = null;
  if (dueDate) {
    const due = new Date(dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    days_remaining = Math.ceil(
      (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  return {
    total_tasks: taskList.length,
    done_tasks,
    overdue_tasks,
    estimated_hours,
    logged_hours: Math.round((loggedMinutes / 60) * 10) / 10,
    days_remaining,
  };
}

export async function getProjectActivity(
  projectId: string,
): Promise<ActivityRow[]> {
  const supabase = await createClient();

  const { data: taskIds, error: taskError } = await pm(supabase)
    .from("tasks")
    .select("id")
    .eq("project_id", projectId);

  if (taskError) throw new Error(taskError.message);

  const ids = [projectId, ...(taskIds ?? []).map((t) => t.id)];

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
    .in("entity_id", ids)
    .order("changed_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

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
}

export type ProjectOwnerContext = {
  ownerId: string | null;
  projectName: string;
};

/** Project owner + name for server-side notifications (service role). */
export async function getProjectOwnerContext(
  projectId: string,
): Promise<ProjectOwnerContext | null> {
  const service = createServiceClient();
  const { data, error } = await pm(service)
    .from("projects")
    .select("name, owner_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    console.error("[getProjectOwnerContext]", error.message);
    return null;
  }

  if (!data) return null;

  return {
    ownerId: data.owner_id,
    projectName: data.name?.trim() || "a project",
  };
}
