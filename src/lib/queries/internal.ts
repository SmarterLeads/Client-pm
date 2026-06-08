import { createClient } from "@/lib/supabase/server";
import { pm } from "@/lib/supabase/pm";
import type { AttachmentListItem } from "@/lib/attachments/types";
import { getAttachmentsForEntity } from "@/lib/queries/attachments";
import type {
  InternalMilestone,
  InternalProject,
  InternalProjectSection,
  InternalTask,
  MeetingType,
  MeetingVisibility,
  TeamMeeting,
} from "@/lib/types/internal";
import type {
  ProjectMemberRole,
  ProjectStatus,
  RagStatus,
  TaskPriority,
  TaskStatus,
  TeamMember,
} from "@/lib/types";
import type {
  InternalProjectListFilters,
  MeetingFilters,
} from "@/lib/validations/internal";

/** Internal tables from migration 006 — regenerate database.ts for full typing. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function internalPm(client: Awaited<ReturnType<typeof createClient>>): any {
  return pm(client);
}

export type InternalProjectListRow = {
  id: string;
  name: string;
  status: ProjectStatus;
  rag_status: RagStatus;
  owner_name: string | null;
  due_date: string | null;
  total_tasks: number;
  done_tasks: number;
};

export type InternalProjectDetail = {
  project: InternalProject;
  owner_name: string | null;
};

export type InternalProjectTaskRow = {
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

export type InternalProjectHealth = {
  total_tasks: number;
  done_tasks: number;
  overdue_tasks: number;
  estimated_hours: number;
  logged_hours: number;
  days_remaining: number | null;
};

export type InternalProjectMemberRow = {
  id: string;
  project_id: string;
  team_member_id: string;
  role: ProjectMemberRole;
  joined_at: string;
  team_member: Pick<TeamMember, "id" | "name" | "email" | "avatar_url">;
};

export type InternalTaskCommentRow = {
  id: string;
  body: string;
  created_at: string;
  author_name: string | null;
};

export type InternalTaskDetail = {
  task: InternalTask;
  project_name: string;
  sections: InternalProjectSection[];
  project_tasks: { id: string; title: string }[];
  subtasks: InternalTask[];
  comments: InternalTaskCommentRow[];
  subtask_count: number;
  comment_count: number;
  attachments: AttachmentListItem[];
};

export type MeetingParticipantRow = {
  id: string;
  team_member_id: string;
  name: string;
  avatar_url: string | null;
};

export type MeetingListRow = {
  id: string;
  title: string;
  type: MeetingType;
  summary: string | null;
  body: string | null;
  occurred_at: string;
  visibility: MeetingVisibility;
  created_by: string;
  creator_name: string | null;
  creator_avatar_url: string | null;
  participants: MeetingParticipantRow[];
};

export type MeetingDetail = MeetingListRow;

export async function getInternalProjectFilterOptions(): Promise<{
  owners: { id: string; name: string }[];
}> {
  const supabase = await createClient();
  const { data, error } = await internalPm(supabase)
    .from("internal_projects")
    .select("owner_id, owner:team_members(id, name)")
    .not("owner_id", "is", null);

  if (error) throw new Error(error.message);

  const ownersMap = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.owner?.id && row.owner?.name) {
      ownersMap.set(row.owner.id, row.owner.name);
    }
  }

  return {
    owners: [...ownersMap.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function getInternalProjects(
  filters: InternalProjectListFilters = {},
): Promise<InternalProjectListRow[]> {
  const supabase = await createClient();

  let query = internalPm(supabase)
    .from("internal_projects")
    .select(
      `
      id,
      name,
      status,
      rag_status,
      due_date,
      owner:team_members(name),
      tasks:internal_tasks(id, status)
    `,
    )
    .order("name", { ascending: true });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.owner) query = query.eq("owner_id", filters.owner);
  if (filters.q?.trim()) query = query.ilike("name", `%${filters.q.trim()}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: {
    id: string;
    name: string;
    status: ProjectStatus;
    rag_status: RagStatus;
    due_date: string | null;
    owner?: { name: string | null } | null;
    tasks?: { id: string; status: TaskStatus }[] | null;
  }) => {
    const tasks = row.tasks ?? [];
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      rag_status: row.rag_status,
      owner_name: row.owner?.name ?? null,
      due_date: row.due_date,
      total_tasks: tasks.length,
      done_tasks: tasks.filter((t) => t.status === "done").length,
    };
  });
}

export async function getInternalProjectById(
  id: string,
): Promise<InternalProjectDetail | null> {
  const supabase = await createClient();

  const { data, error } = await internalPm(supabase)
    .from("internal_projects")
    .select(`*, owner:team_members(name)`)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    project: {
      id: data.id,
      name: data.name,
      description: data.description,
      status: data.status,
      rag_status: data.rag_status,
      owner_id: data.owner_id,
      start_date: data.start_date,
      due_date: data.due_date,
      created_at: data.created_at,
      updated_at: data.updated_at,
    },
    owner_name: data.owner?.name ?? null,
  };
}

export async function getInternalProjectSections(
  projectId: string,
): Promise<InternalProjectSection[]> {
  const supabase = await createClient();
  const { data, error } = await internalPm(supabase)
    .from("internal_project_sections")
    .select("*")
    .eq("project_id", projectId)
    .order("display_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getInternalTasks(
  projectId: string,
): Promise<InternalProjectTaskRow[]> {
  const supabase = await createClient();

  const [tasksRes, subtasksRes] = await Promise.all([
    internalPm(supabase)
      .from("internal_tasks")
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
        comments:internal_task_comments(id)
      `,
      )
      .eq("project_id", projectId)
      .is("parent_task_id", null)
      .order("created_at", { ascending: true }),
    internalPm(supabase)
      .from("internal_tasks")
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

  return (tasksRes.data ?? []).map((task: {
    id: string;
    title: string;
    priority: TaskPriority;
    status: TaskStatus;
    section_id: string | null;
    due_date: string | null;
    assignee_id: string | null;
    is_recurring: boolean;
    assignee?: { name: string | null; avatar_url: string | null } | null;
    comments?: { id: string }[] | null;
  }) => ({
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

export async function getInternalProjectMilestones(
  projectId: string,
): Promise<InternalMilestone[]> {
  const supabase = await createClient();
  const { data, error } = await internalPm(supabase)
    .from("internal_milestones")
    .select("*")
    .eq("project_id", projectId)
    .order("target_date", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getInternalProjectMembers(
  projectId: string,
): Promise<InternalProjectMemberRow[]> {
  const supabase = await createClient();

  const { data, error } = await internalPm(supabase)
    .from("internal_project_members")
    .select(`*, team_member:team_members(id, name, email, avatar_url)`)
    .eq("project_id", projectId)
    .order("joined_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter(
      (row: { team_member: InternalProjectMemberRow["team_member"] | null }) =>
        Boolean(row.team_member),
    )
    .map((row: InternalProjectMemberRow) => ({
      id: row.id,
      project_id: row.project_id,
      team_member_id: row.team_member_id,
      role: row.role,
      joined_at: row.joined_at,
      team_member: row.team_member,
    }));
}

export async function getInternalProjectHealth(
  projectId: string,
  dueDate: string | null,
): Promise<InternalProjectHealth> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: tasks, error: tasksError } = await internalPm(supabase)
    .from("internal_tasks")
    .select("id, status, due_date, estimated_hours")
    .eq("project_id", projectId)
    .is("parent_task_id", null);

  if (tasksError) throw new Error(tasksError.message);

  const taskList = tasks ?? [];
  const taskIds = taskList.map((t: { id: string }) => t.id);

  let loggedMinutes = 0;
  if (taskIds.length > 0) {
    const { data: timeEntries, error: timeError } = await internalPm(supabase)
      .from("internal_time_entries")
      .select("duration_minutes")
      .in("task_id", taskIds);

    if (timeError) throw new Error(timeError.message);
    loggedMinutes = (timeEntries ?? []).reduce(
      (sum: number, e: { duration_minutes: number }) =>
        sum + e.duration_minutes,
      0,
    );
  }

  const done_tasks = taskList.filter(
    (t: { status: TaskStatus }) => t.status === "done",
  ).length;
  const overdue_tasks = taskList.filter(
    (t: { status: TaskStatus; due_date: string | null }) =>
      t.status !== "done" &&
      t.status !== "cancelled" &&
      t.due_date &&
      t.due_date < today,
  ).length;
  const estimated_hours = taskList.reduce(
    (sum: number, t: { estimated_hours: number | null }) =>
      sum + (t.estimated_hours ?? 0),
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

export async function getInternalTaskById(
  taskId: string,
): Promise<InternalTaskDetail | null> {
  const supabase = await createClient();

  const { data: task, error: taskError } = await internalPm(supabase)
    .from("internal_tasks")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError || !task) return null;

  const { data: project, error: projectError } = await internalPm(supabase)
    .from("internal_projects")
    .select("name")
    .eq("id", task.project_id)
    .maybeSingle();

  if (projectError || !project) return null;

  const [
    sectionsRes,
    projectTasksRes,
    subtasksRes,
    commentsRes,
    subtaskCountRes,
    commentCountRes,
    attachments,
  ] = await Promise.all([
    internalPm(supabase)
      .from("internal_project_sections")
      .select("*")
      .eq("project_id", task.project_id)
      .order("display_order"),
    internalPm(supabase)
      .from("internal_tasks")
      .select("id, title")
      .eq("project_id", task.project_id)
      .is("parent_task_id", null)
      .neq("id", taskId)
      .order("title"),
    internalPm(supabase)
      .from("internal_tasks")
      .select("*")
      .eq("parent_task_id", taskId)
      .order("created_at"),
    internalPm(supabase)
      .from("internal_task_comments")
      .select("id, body, created_at, author:team_members(name)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true }),
    internalPm(supabase)
      .from("internal_tasks")
      .select("id", { count: "exact", head: true })
      .eq("parent_task_id", taskId),
    internalPm(supabase)
      .from("internal_task_comments")
      .select("id", { count: "exact", head: true })
      .eq("task_id", taskId),
    getAttachmentsForEntity("internal_task", taskId).catch(() => []),
  ]);

  return {
    task,
    project_name: project.name,
    sections: sectionsRes.data ?? [],
    project_tasks: projectTasksRes.data ?? [],
    subtasks: subtasksRes.data ?? [],
    comments: (commentsRes.data ?? []).map(
      (c: {
        id: string;
        body: string;
        created_at: string;
        author?: { name: string | null } | null;
      }) => ({
        id: c.id,
        body: c.body,
        created_at: c.created_at,
        author_name: c.author?.name ?? null,
      }),
    ),
    subtask_count: subtaskCountRes.count ?? 0,
    comment_count: commentCountRes.count ?? 0,
    attachments,
  };
}

export async function getMeetings(
  filters: MeetingFilters = {},
): Promise<MeetingListRow[]> {
  const supabase = await createClient();

  let query = internalPm(supabase)
    .from("team_meetings")
    .select(
      `
      *,
      creator:team_members!team_meetings_created_by_fkey(name, avatar_url),
      participants:meeting_participants(
        id,
        team_member_id,
        member:team_members!meeting_participants_team_member_id_fkey(name, avatar_url)
      )
    `,
    )
    .order("occurred_at", { ascending: false });

  if (filters.type) query = query.eq("type", filters.type);
  if (filters.visibility) query = query.eq("visibility", filters.visibility);
  if (filters.from) query = query.gte("occurred_at", filters.from);
  if (filters.to) query = query.lte("occurred_at", filters.to);

  const { data, error } = await query;

  if (error) {
    console.error("[getMeetings] Supabase error:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(error.message);
  }

  let rows = (data ?? []) as Array<
    TeamMeeting & {
      creator?: { name: string | null; avatar_url: string | null } | null;
      participants?: Array<{
        id: string;
        team_member_id: string;
        member?: { name: string | null; avatar_url: string | null } | null;
      }> | null;
    }
  >;

  if (filters.participant) {
    rows = rows.filter((row) =>
      (row.participants ?? []).some(
        (p) => p.team_member_id === filters.participant,
      ),
    );
  }

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type,
    summary: row.summary,
    body: row.body,
    occurred_at: row.occurred_at,
    visibility: row.visibility,
    created_by: row.created_by,
    creator_name: row.creator?.name ?? null,
    creator_avatar_url: row.creator?.avatar_url ?? null,
    participants: (row.participants ?? []).map((p) => ({
      id: p.id,
      team_member_id: p.team_member_id,
      name: p.member?.name ?? "Unknown",
      avatar_url: p.member?.avatar_url ?? null,
    })),
  }));
}

export async function getMeetingById(id: string): Promise<MeetingDetail | null> {
  const supabase = await createClient();

  const { data, error } = await internalPm(supabase)
    .from("team_meetings")
    .select(
      `
      *,
      creator:team_members!team_meetings_created_by_fkey(name, avatar_url),
      participants:meeting_participants(
        id,
        team_member_id,
        member:team_members!meeting_participants_team_member_id_fkey(name, avatar_url)
      )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[getMeetingById] Supabase error:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(error.message);
  }

  if (!data) return null;

  const row = data as TeamMeeting & {
    creator?: { name: string | null; avatar_url: string | null } | null;
    participants?: Array<{
      id: string;
      team_member_id: string;
      member?: { name: string | null; avatar_url: string | null } | null;
    }> | null;
  };

  return {
    id: row.id,
    title: row.title,
    type: row.type,
    summary: row.summary,
    body: row.body,
    occurred_at: row.occurred_at,
    visibility: row.visibility,
    created_by: row.created_by,
    creator_name: row.creator?.name ?? null,
    creator_avatar_url: row.creator?.avatar_url ?? null,
    participants: (row.participants ?? []).map((p) => ({
      id: p.id,
      team_member_id: p.team_member_id,
      name: p.member?.name ?? "Unknown",
      avatar_url: p.member?.avatar_url ?? null,
    })),
  };
}

export async function getTeamMembersForInternalSelect(): Promise<
  Pick<TeamMember, "id" | "name" | "email" | "avatar_url">[]
> {
  const supabase = await createClient();
  const { data, error } = await internalPm(supabase)
    .from("team_members")
    .select("id, name, email, avatar_url")
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}
