import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";
import type { TaskStatus, TeamMember } from "@/lib/types";
import type {
  MemberTaskRow,
  MemberTasksByProject,
  TeamWorkloadMember,
} from "@/lib/team/types";

export type {
  MemberTaskRow,
  MemberTasksByProject,
  TeamWorkloadMember,
} from "@/lib/team/types";

const OPEN_STATUSES: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
];

export async function getTeamWorkloadMembers(): Promise<TeamWorkloadMember[]> {
  const supabase = await createClient();

  const [workloadRes, membersRes] = await Promise.all([
    pm(supabase)
      .from("v_team_workload")
      .select("*")
      .order("name"),
    pm(supabase)
      .from("team_members")
      .select("id, role, avatar_url")
      .eq("is_active", true),
  ]);

  if (workloadRes.error) throw new Error(workloadRes.error.message);
  if (membersRes.error) throw new Error(membersRes.error.message);

  const memberMeta = new Map(
    (membersRes.data ?? []).map((m) => [m.id, m]),
  );

  return (workloadRes.data ?? [])
    .filter((row): row is typeof row & { id: string; name: string } =>
      Boolean(row.id && row.name),
    )
    .map((row) => {
      const meta = memberMeta.get(row.id);
      return {
        id: row.id,
        name: row.name,
        role: meta?.role ?? "member",
        avatar_url: meta?.avatar_url ?? null,
        agency_name: row.agency_name ?? null,
        capacity_hours: row.capacity_hours ?? 0,
        estimated_hours_remaining: row.estimated_hours_remaining ?? 0,
        is_available: row.is_available ?? true,
        open_tasks: row.open_tasks ?? 0,
        overdue_tasks: row.overdue_tasks ?? 0,
      };
    });
}

export async function getAllMemberOpenTasksByProject(): Promise<
  Record<string, MemberTasksByProject[]>
> {
  const supabase = await createClient();

  const { data, error } = await pm(supabase)
    .from("tasks")
    .select(
      `
      id,
      title,
      priority,
      due_date,
      assignee_id,
      project_id,
      project:projects(name)
    `,
    )
    .not("assignee_id", "is", null)
    .is("parent_task_id", null)
    .in("status", OPEN_STATUSES)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);

  const byMember = new Map<string, Map<string, MemberTasksByProject>>();

  for (const row of data ?? []) {
    if (!row.assignee_id) continue;

    const projectId = row.project_id;
    const projectName = row.project?.name ?? "—";
    const task: MemberTaskRow = {
      id: row.id,
      title: row.title,
      priority: row.priority,
      due_date: row.due_date,
      project_id: projectId,
      project_name: projectName,
    };

    if (!byMember.has(row.assignee_id)) {
      byMember.set(row.assignee_id, new Map());
    }

    const memberProjects = byMember.get(row.assignee_id)!;
    if (!memberProjects.has(projectId)) {
      memberProjects.set(projectId, {
        project_id: projectId,
        project_name: projectName,
        tasks: [],
      });
    }

    memberProjects.get(projectId)!.tasks.push(task);
  }

  const result: Record<string, MemberTasksByProject[]> = {};
  for (const [memberId, projects] of byMember) {
    result[memberId] = Array.from(projects.values()).sort((a, b) =>
      a.project_name.localeCompare(b.project_name),
    );
  }

  return result;
}

export async function getTeamMembersForReassign(): Promise<
  Pick<TeamMember, "id" | "name">[]
> {
  const supabase = await createClient();
  const { data, error } = await pm(supabase)
    .from("team_members")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}
