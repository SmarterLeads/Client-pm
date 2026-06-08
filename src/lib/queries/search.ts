import {
  clientNameFromMap,
  loadClientNameMap,
} from "@/lib/clients/client-names";
import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";

export type SearchResultItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export type GlobalSearchResults = {
  clients: SearchResultItem[];
  projects: SearchResultItem[];
  tasks: SearchResultItem[];
  team_members: SearchResultItem[];
};

const EMPTY_RESULTS: GlobalSearchResults = {
  clients: [],
  projects: [],
  tasks: [],
  team_members: [],
};

export async function globalSearch(query: string): Promise<GlobalSearchResults> {
  const q = query.trim();
  if (!q) return EMPTY_RESULTS;

  const supabase = await createClient();
  const pattern = `%${q}%`;

  const [clientsRes, projectsRes, tasksRes, membersRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, status")
      .ilike("name", pattern)
      .order("name")
      .limit(5),
    pm(supabase)
      .from("projects")
      .select("id, name, status, client_id")
      .ilike("name", pattern)
      .order("name")
      .limit(5),
    pm(supabase)
      .from("tasks")
      .select("id, title, status, project_id, project:projects(name, client_id)")
      .is("parent_task_id", null)
      .ilike("title", pattern)
      .order("title")
      .limit(8),
    pm(supabase)
      .from("team_members")
      .select("id, name, email")
      .eq("is_active", true)
      .or(`name.ilike."${pattern}",email.ilike."${pattern}"`)
      .order("name")
      .limit(5),
  ]);

  if (clientsRes.error) throw new Error(clientsRes.error.message);
  if (projectsRes.error) throw new Error(projectsRes.error.message);
  if (tasksRes.error) throw new Error(tasksRes.error.message);
  if (membersRes.error) throw new Error(membersRes.error.message);

  const projectRows = projectsRes.data ?? [];
  const taskRows = tasksRes.data ?? [];
  const clientNameMap = await loadClientNameMap(supabase, [
    ...projectRows.map((row) => row.client_id),
    ...taskRows.map((row) => row.project?.client_id),
  ]);

  return {
    clients: (clientsRes.data ?? []).map((row) => ({
      id: row.id,
      title: row.name,
      subtitle: row.status ? `Client · ${row.status}` : "Client",
      href: `/clients/${row.id}`,
    })),
    projects: projectRows.map((row) => {
      const clientName = clientNameFromMap(row.client_id, clientNameMap);
      return {
        id: row.id,
        title: row.name,
        subtitle:
          clientName !== "—"
            ? `${clientName} · ${row.status}`
            : (row.status ?? "Project"),
        href: `/projects/${row.id}`,
      };
    }),
    tasks: taskRows.map((row) => {
      const clientName = clientNameFromMap(row.project?.client_id, clientNameMap);
      const projectName = row.project?.name ?? "Task";
      return {
        id: row.id,
        title: row.title,
        subtitle:
          clientName !== "—"
            ? `${projectName} · ${clientName}`
            : projectName,
        href: `/projects/${row.project_id}`,
      };
    }),
    team_members: (membersRes.data ?? []).map((row) => ({
      id: row.id,
      title: row.name,
      subtitle: row.email ?? "Team member",
      href: "/team",
    })),
  };
}
