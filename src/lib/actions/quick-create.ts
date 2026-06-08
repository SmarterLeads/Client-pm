"use server";

import { getAgenciesList } from "@/lib/queries/agencies";
import { getClientContacts } from "@/lib/queries/clients";
import {
  getClientsForSelect,
  getProjectsForSelect,
  getProjectSections,
  getTeamMembersForSelect,
} from "@/lib/queries/projects";
import { getActiveTemplatesForSelect } from "@/lib/queries/templates";

export async function loadQuickCreateFormData() {
  const [clients, agencies, teamMembers, templates, projects] =
    await Promise.all([
      getClientsForSelect(),
      getAgenciesList(),
      getTeamMembersForSelect(),
      getActiveTemplatesForSelect(),
      getProjectsForSelect(),
    ]);

  return { clients, agencies, teamMembers, templates, projects };
}

export async function loadQuickCreateProjectSections(projectId: string) {
  const sections = await getProjectSections(projectId);
  return sections.map((section) => ({
    id: section.id,
    name: section.name,
  }));
}

export async function loadQuickCreateClientContacts(clientId: string) {
  return getClientContacts(clientId);
}
