import {
  clientNameFromMap,
  loadClientNameMap,
} from "@/lib/clients/client-names";
import type { AttachmentListItem } from "@/lib/attachments/types";
import { getAttachmentsForEntity } from "@/lib/queries/attachments";
import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";
import type { ProjectSection, Task, TeamMember } from "@/lib/types";
import type { TaskPriority, TaskStatus } from "@/lib/types";
import type { MyTasksDueDateFilter } from "@/lib/validations/task";

export type TaskCommentRow = {
  id: string;
  body: string;
  created_at: string;
  author_name: string | null;
};

export type TaskTimeEntryRow = {
  id: string;
  duration_minutes: number;
  billable: boolean;
  logged_date: string;
  description: string | null;
  logger_name: string | null;
};

export type TaskDependencyRow = {
  id: string;
  depends_on_task_id: string;
  depends_on_title: string;
};

export type TaskPickerOption = {
  id: string;
  title: string;
};

export type TaskDetail = {
  task: Task;
  project_name: string;
  client_name: string;
  sections: ProjectSection[];
  project_tasks: TaskPickerOption[];
  subtasks: Task[];
  dependencies: TaskDependencyRow[];
  comments: TaskCommentRow[];
  time_entries: TaskTimeEntryRow[];
  subtask_count: number;
  comment_count: number;
  attachments: AttachmentListItem[];
};

export type MyTaskRow = {
  id: string;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  updated_at: string | null;
  project_id: string;
  project_name: string;
  client_name: string;
  is_recurring: boolean;
};

export type MyTaskGroup = "overdue" | "today" | "week" | "later";

export type GroupedMyTasks = Record<MyTaskGroup, MyTaskRow[]>;

export type MyTasksFilters = {
  search?: string;
  clientId?: string;
  dueDateFilter?: MyTasksDueDateFilter;
  showCompleted?: boolean;
};

export type MyTasksResult = {
  active: MyTaskRow[];
  completed: MyTaskRow[];
  completedCount: number;
};

const COMPLETED_TASKS_LIMIT = 100;

type TaskQueryRow = {
  id: string;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  updated_at: string;
  is_recurring: boolean | null;
  project_id: string;
  project: { name: string | null; client_id: string | null } | null;
};

export type MyTaskClientOption = {
  id: string;
  name: string;
};

const OPEN_TASK_STATUSES: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function endOfWeekIso() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function nextWeekRange() {
  const weekEnd = endOfWeekIso();
  const start = new Date(`${weekEnd}T12:00:00`);
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function groupMyTasks(tasks: MyTaskRow[]): GroupedMyTasks {
  const today = todayIso();
  const weekEnd = endOfWeekIso();
  const groups: GroupedMyTasks = {
    overdue: [],
    today: [],
    week: [],
    later: [],
  };

  for (const task of tasks) {
    if (!task.due_date) {
      groups.later.push(task);
      continue;
    }
    if (
      task.due_date < today &&
      task.status !== "done" &&
      task.status !== "cancelled"
    ) {
      groups.overdue.push(task);
    } else if (task.due_date === today) {
      groups.today.push(task);
    } else if (task.due_date > today && task.due_date <= weekEnd) {
      groups.week.push(task);
    } else {
      groups.later.push(task);
    }
  }

  return groups;
}

async function resolveProjectIdsForClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
): Promise<string[] | null> {
  const { data: projects, error: projectsError } = await pm(supabase)
    .from("projects")
    .select("id")
    .eq("client_id", clientId);

  if (projectsError) throw new Error(projectsError.message);

  const projectIds = (projects ?? []).map((project) => project.id);
  return projectIds.length > 0 ? projectIds : null;
}

async function mapTaskQueryRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: TaskQueryRow[],
): Promise<MyTaskRow[]> {
  if (rows.length === 0) return [];

  const clientNameMap = await loadClientNameMap(
    supabase,
    rows.map((row) => row.project?.client_id).filter((id): id is string => Boolean(id)),
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    priority: row.priority,
    status: row.status,
    due_date: row.due_date,
    updated_at: row.updated_at,
    project_id: row.project_id,
    project_name: row.project?.name ?? "—",
    client_name: clientNameFromMap(row.project?.client_id, clientNameMap),
    is_recurring: row.is_recurring ?? false,
  }));
}

function applyMyTaskListFilters<
  T extends {
    ilike: (column: string, pattern: string) => T;
  },
>(query: T, filters: MyTasksFilters): T {
  if (filters.search?.trim()) {
    return query.ilike("title", `%${filters.search.trim()}%`);
  }

  return query;
}

async function getClientProjectIdsFilter(
  filters: MyTasksFilters,
): Promise<string[] | null | undefined> {
  if (!filters.clientId) return undefined;

  const supabase = await createClient();
  return resolveProjectIdsForClient(supabase, filters.clientId);
}

function applyDueDateFilter<
  T extends {
    lt: (column: string, value: string) => T;
    not: (column: string, operator: string, value: null) => T;
    eq: (column: string, value: string) => T;
    gt: (column: string, value: string) => T;
    lte: (column: string, value: string) => T;
    gte: (column: string, value: string) => T;
    is: (column: string, value: null) => T;
  },
>(query: T, filters: MyTasksFilters): T {
  if (!filters.dueDateFilter || filters.dueDateFilter === "all") {
    return query;
  }

  const today = todayIso();

  switch (filters.dueDateFilter) {
    case "overdue":
      return query.lt("due_date", today).not("due_date", "is", null);
    case "today":
      return query.eq("due_date", today);
    case "this_week":
      return query.gt("due_date", today).lte("due_date", endOfWeekIso());
    case "next_week": {
      const { start, end } = nextWeekRange();
      return query.gte("due_date", start).lte("due_date", end);
    }
    case "no_due_date":
      return query.is("due_date", null);
    default:
      return query;
  }
}

async function fetchActiveMyTasks(
  assigneeId: string,
  filters: MyTasksFilters,
): Promise<MyTaskRow[]> {
  const supabase = await createClient();

  let query = pm(supabase)
    .from("tasks")
    .select(
      `
      id,
      title,
      priority,
      status,
      due_date,
      updated_at,
      is_recurring,
      project_id,
      project:projects(name, client_id)
    `,
    )
    .eq("assignee_id", assigneeId)
    .is("parent_task_id", null)
    .in("status", OPEN_TASK_STATUSES);

  query = applyMyTaskListFilters(query, filters);
  query = applyDueDateFilter(query, filters);

  const projectIds = await getClientProjectIdsFilter(filters);
  if (projectIds === null) return [];
  if (projectIds) query = query.in("project_id", projectIds);

  const { data, error } = await query.order("due_date", {
    ascending: true,
    nullsFirst: false,
  });

  if (error) throw new Error(error.message);

  return mapTaskQueryRows(supabase, (data ?? []) as TaskQueryRow[]);
}

async function fetchCompletedMyTaskCount(
  assigneeId: string,
  filters: MyTasksFilters,
): Promise<number> {
  const supabase = await createClient();

  let query = pm(supabase)
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("assignee_id", assigneeId)
    .is("parent_task_id", null)
    .eq("status", "done");

  query = applyMyTaskListFilters(query, filters);

  const projectIds = await getClientProjectIdsFilter(filters);
  if (projectIds === null) return 0;
  if (projectIds) query = query.in("project_id", projectIds);

  const { count, error } = await query;
  if (error) throw new Error(error.message);

  return count ?? 0;
}

async function fetchCompletedMyTasks(
  assigneeId: string,
  filters: MyTasksFilters,
): Promise<MyTaskRow[]> {
  const supabase = await createClient();

  let query = pm(supabase)
    .from("tasks")
    .select(
      `
      id,
      title,
      priority,
      status,
      due_date,
      updated_at,
      is_recurring,
      project_id,
      project:projects(name, client_id)
    `,
    )
    .eq("assignee_id", assigneeId)
    .is("parent_task_id", null)
    .eq("status", "done");

  query = applyMyTaskListFilters(query, filters);

  const projectIds = await getClientProjectIdsFilter(filters);
  if (projectIds === null) return [];
  if (projectIds) query = query.in("project_id", projectIds);

  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .limit(COMPLETED_TASKS_LIMIT);

  if (error) throw new Error(error.message);

  return mapTaskQueryRows(supabase, (data ?? []) as TaskQueryRow[]);
}

export async function getMyTaskClientOptions(
  assigneeId: string,
): Promise<MyTaskClientOption[]> {
  const supabase = await createClient();

  const { data, error } = await pm(supabase)
    .from("tasks")
    .select("project:projects!inner(client_id)")
    .eq("assignee_id", assigneeId)
    .is("parent_task_id", null)
    .in("status", OPEN_TASK_STATUSES);

  if (error) throw new Error(error.message);

  const clientIds = [
    ...new Set(
      (data ?? [])
        .map((row) => row.project?.client_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (clientIds.length === 0) return [];

  const clientNameMap = await loadClientNameMap(supabase, clientIds);

  return clientIds
    .map((id) => ({
      id,
      name: clientNameFromMap(id, clientNameMap),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getMyTasks(
  assigneeId: string,
  filters: MyTasksFilters = {},
): Promise<MyTasksResult> {
  const [active, completedCount] = await Promise.all([
    fetchActiveMyTasks(assigneeId, filters),
    fetchCompletedMyTaskCount(assigneeId, filters),
  ]);

  const completed = filters.showCompleted
    ? await fetchCompletedMyTasks(assigneeId, filters)
    : [];

  return { active, completed, completedCount };
}

export async function getTaskDetail(taskId: string): Promise<TaskDetail | null> {
  const supabase = await createClient();

  const { data: task, error: taskError } = await pm(supabase)
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError || !task) return null;

  const { data: project, error: projectError } = await pm(supabase)
    .from("projects")
    .select("name, client_id")
    .eq("id", task.project_id)
    .maybeSingle();

  if (projectError || !project) return null;

  const clientNameMap = await loadClientNameMap(supabase, [project.client_id]);
  const clientName = clientNameFromMap(project.client_id, clientNameMap);

  const [
    sectionsRes,
    projectTasksRes,
    subtasksRes,
    depsRes,
    commentsRes,
    timeRes,
    subtaskCountRes,
    commentCountRes,
    attachments,
  ] = await Promise.all([
    pm(supabase)
      .from("project_sections")
      .select("*")
      .eq("project_id", task.project_id)
      .order("display_order"),
    pm(supabase)
      .from("tasks")
      .select("id, title")
      .eq("project_id", task.project_id)
      .is("parent_task_id", null)
      .neq("id", taskId)
      .order("title"),
    pm(supabase)
      .from("tasks")
      .select("*")
      .eq("parent_task_id", taskId)
      .order("created_at"),
    pm(supabase)
      .from("task_dependencies")
      .select("id, depends_on_task_id")
      .eq("task_id", taskId),
    pm(supabase)
      .from("task_comments")
      .select("id, body, created_at, author:team_members(name)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true }),
    pm(supabase)
      .from("time_entries")
      .select(
        "id, duration_minutes, billable, logged_date, description, logger:team_members(name)",
      )
      .eq("task_id", taskId)
      .order("logged_date", { ascending: false }),
    pm(supabase)
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("parent_task_id", taskId),
    pm(supabase)
      .from("task_comments")
      .select("id", { count: "exact", head: true })
      .eq("task_id", taskId),
    getAttachmentsForEntity("task", taskId),
  ]);

  const depTaskIds = (depsRes.data ?? []).map((d) => d.depends_on_task_id);
  let depTitles = new Map<string, string>();
  if (depTaskIds.length > 0) {
    const { data: depTasks } = await pm(supabase)
      .from("tasks")
      .select("id, title")
      .in("id", depTaskIds);
    depTitles = new Map((depTasks ?? []).map((t) => [t.id, t.title]));
  }

  return {
    task,
    project_name: project.name,
    client_name: clientName,
    sections: sectionsRes.data ?? [],
    project_tasks: projectTasksRes.data ?? [],
    subtasks: subtasksRes.data ?? [],
    dependencies: (depsRes.data ?? []).map((d) => ({
      id: d.id,
      depends_on_task_id: d.depends_on_task_id,
      depends_on_title: depTitles.get(d.depends_on_task_id) ?? "Unknown task",
    })),
    comments: (commentsRes.data ?? []).map((c) => ({
      id: c.id,
      body: c.body,
      created_at: c.created_at,
      author_name: c.author?.name ?? null,
    })),
    time_entries: (timeRes.data ?? []).map((e) => ({
      id: e.id,
      duration_minutes: e.duration_minutes,
      billable: e.billable,
      logged_date: e.logged_date,
      description: e.description,
      logger_name: e.logger?.name ?? null,
    })),
    subtask_count: subtaskCountRes.count ?? 0,
    comment_count: commentCountRes.count ?? 0,
    attachments,
  };
}

export async function getTeamMembersForTasks(): Promise<
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

export type TaskToReviewRow = {
  id: string;
  title: string;
  project_id: string;
  project_name: string;
  client_name: string;
  assignee_name: string | null;
  completed_at: string;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
};

type TaskToReviewQueryRow = {
  id: string;
  title: string;
  updated_at: string;
  reviewed_at: string | null;
  project_id: string;
  assignee: { name: string | null } | null;
  project: { name: string | null; client_id: string | null } | null;
};

export async function getTasksToReview(): Promise<TaskToReviewRow[]> {
  const supabase = await createClient();

  const { data, error } = await pm(supabase)
    .from("tasks")
    .select(
      `
      id,
      title,
      updated_at,
      reviewed_at,
      project_id,
      assignee:team_members!assignee_id(name),
      project:projects(name, client_id)
    `,
    )
    .eq("status", "done")
    .is("reviewed_by", null)
    .is("parent_task_id", null)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as TaskToReviewQueryRow[];
  const clientNameMap = await loadClientNameMap(
    supabase,
    rows.map((row) => row.project?.client_id).filter((id): id is string => Boolean(id)),
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    project_id: row.project_id,
    project_name: row.project?.name ?? "—",
    client_name: clientNameFromMap(row.project?.client_id, clientNameMap),
    assignee_name: row.assignee?.name ?? null,
    completed_at: row.updated_at,
    reviewed_by_name: null,
    reviewed_at: null,
  }));
}
