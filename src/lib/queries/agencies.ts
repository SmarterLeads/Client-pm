import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";
import type { Agency } from "@/lib/types";
import type { TaskStatus } from "@/lib/types";

export type AgencyListRow = Pick<Agency, "id" | "name" | "created_at">;

export type AgencyAccountManager = {
  id: string;
  name: string;
};

export type AgencyWithStats = {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  created_at: string;
  client_count: number;
  active_projects: number;
  open_tasks: number;
  account_managers: AgencyAccountManager[];
};

const OPEN_TASK_STATUSES: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
];

const DEFAULT_ACCENT = "#6366f1";

export function agencyAccentColor(primaryColor: string | null | undefined) {
  if (!primaryColor?.trim()) return DEFAULT_ACCENT;
  return primaryColor.trim();
}

export async function getAgenciesList(): Promise<AgencyListRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agencies")
    .select("id, name, created_at")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getAgencyById(id: string): Promise<Agency | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agencies")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Agency overview stats (equivalent to joining public.agencies, public.clients,
 * and pm.projects / pm.tasks, aggregated in application code).
 */
export async function getAgenciesWithStats(): Promise<AgencyWithStats[]> {
  const supabase = await createClient();

  const [agenciesRes, clientsRes, projectsRes, tasksRes] = await Promise.all([
    supabase
      .from("agencies")
      .select("id, name, logo_url, primary_color, created_at")
      .order("name", { ascending: true }),
    supabase.from("clients").select("id, agency_id, account_manager_id"),
    pm(supabase).from("projects").select("id, client_id, status"),
    pm(supabase)
      .from("tasks")
      .select("id, project_id, status")
      .in("status", OPEN_TASK_STATUSES),
  ]);

  if (agenciesRes.error) throw new Error(agenciesRes.error.message);
  if (clientsRes.error) throw new Error(clientsRes.error.message);
  if (projectsRes.error) throw new Error(projectsRes.error.message);
  if (tasksRes.error) throw new Error(tasksRes.error.message);

  const agencies = agenciesRes.data ?? [];
  const clients = clientsRes.data ?? [];
  const projects = projectsRes.data ?? [];
  const tasks = tasksRes.data ?? [];

  const clientAgency = new Map(
    clients.map((client) => [client.id, client.agency_id]),
  );

  const projectClient = new Map(
    projects.map((project) => [project.id, project.client_id]),
  );

  const statsByAgency = new Map<
    string,
    {
      client_count: number;
      active_projects: number;
      open_tasks: number;
      managerIds: Set<string>;
    }
  >();

  for (const agency of agencies) {
    statsByAgency.set(agency.id, {
      client_count: 0,
      active_projects: 0,
      open_tasks: 0,
      managerIds: new Set(),
    });
  }

  for (const client of clients) {
    const bucket = statsByAgency.get(client.agency_id);
    if (!bucket) continue;
    bucket.client_count += 1;
    if (client.account_manager_id) {
      bucket.managerIds.add(client.account_manager_id);
    }
  }

  for (const project of projects) {
    if (project.status !== "active") continue;
    const agencyId = clientAgency.get(project.client_id);
    if (!agencyId) continue;
    const bucket = statsByAgency.get(agencyId);
    if (!bucket) continue;
    bucket.active_projects += 1;
  }

  for (const task of tasks) {
    const clientId = projectClient.get(task.project_id);
    if (!clientId) continue;
    const agencyId = clientAgency.get(clientId);
    if (!agencyId) continue;
    const bucket = statsByAgency.get(agencyId);
    if (!bucket) continue;
    bucket.open_tasks += 1;
  }

  const allManagerIds = [
    ...new Set(
      [...statsByAgency.values()].flatMap((stats) => [...stats.managerIds]),
    ),
  ];

  const managerNameById = new Map<string, string>();

  if (allManagerIds.length > 0) {
    const { data: managers, error: managersError } = await pm(supabase)
      .from("team_members")
      .select("id, name")
      .in("id", allManagerIds);

    if (managersError) throw new Error(managersError.message);

    for (const manager of managers ?? []) {
      managerNameById.set(manager.id, manager.name);
    }
  }

  return agencies.map((agency) => {
    const stats = statsByAgency.get(agency.id) ?? {
      client_count: 0,
      active_projects: 0,
      open_tasks: 0,
      managerIds: new Set<string>(),
    };

    const account_managers = [...stats.managerIds]
      .map((id) => {
        const name = managerNameById.get(id);
        return name ? { id, name } : null;
      })
      .filter((manager): manager is AgencyAccountManager => manager !== null)
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      id: agency.id,
      name: agency.name,
      logo_url: agency.logo_url,
      primary_color: agency.primary_color,
      created_at: agency.created_at,
      client_count: stats.client_count,
      active_projects: stats.active_projects,
      open_tasks: stats.open_tasks,
      account_managers,
    };
  });
}
