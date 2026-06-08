import { pmRpc } from "@/lib/supabase/pm";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database, Json } from "@/lib/types/database";

type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];

/**
 * PostgREST runs each HTTP request in its own transaction. Mutations that need
 * change_history attribution must use RPCs that call set_config + write in one function.
 */
export async function insertClientWithTeamMemberContext(
  teamMemberId: string,
  client: ClientInsert,
  contact?: Record<string, unknown> | null,
): Promise<string> {
  const supabase = createServiceClient();

  const { data, error } = await pmRpc<string>(
    supabase,
    "insert_client_with_team_member_context",
    {
      p_team_member_id: teamMemberId,
      p_client: client as Json,
      p_contact: (contact ?? null) as Json,
    },
  );

  if (error) {
    throw new Error(
      `Failed to create client: ${error.message}. Apply supabase/migrations/20260605120000_client_contacts_rpcs.sql`,
    );
  }

  if (!data) {
    throw new Error("Failed to create client: no id returned.");
  }

  return data;
}

export async function updateClientWithTeamMemberContext(
  teamMemberId: string,
  clientId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await pmRpc(supabase, "update_client_with_team_member_context", {
    p_client_id: clientId,
    p_team_member_id: teamMemberId,
    p_payload: payload as Json,
  });

  if (error) {
    throw new Error(
      `Failed to update client: ${error.message}. Apply supabase/migrations/20260614120000_fix_marketing_channels_array_rpc.sql`,
    );
  }
}

export async function insertClientContactWithTeamMemberContext(
  teamMemberId: string,
  contact: Record<string, unknown>,
): Promise<string> {
  const supabase = createServiceClient();

  const { data, error } = await pmRpc<string>(
    supabase,
    "insert_client_contact_with_team_member_context",
    {
      p_team_member_id: teamMemberId,
      p_contact: contact as Json,
    },
  );

  if (error) {
    throw new Error(
      `Failed to create contact: ${error.message}. Apply supabase/migrations/20260605120000_client_contacts_rpcs.sql`,
    );
  }

  if (!data) {
    throw new Error("Failed to create contact: no id returned.");
  }

  return data;
}

export async function updateClientContactWithTeamMemberContext(
  teamMemberId: string,
  contactId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await pmRpc(
    supabase,
    "update_client_contact_with_team_member_context",
    {
      p_team_member_id: teamMemberId,
      p_contact_id: contactId,
      p_payload: payload as Json,
    },
  );

  if (error) {
    throw new Error(
      `Failed to update contact: ${error.message}. Apply supabase/migrations/20260605120000_client_contacts_rpcs.sql`,
    );
  }
}

export async function insertInteractionWithTeamMemberContext(
  teamMemberId: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const supabase = createServiceClient();

  const { data, error } = await pmRpc<string>(
    supabase,
    "insert_interaction_with_team_member_context",
    {
      p_team_member_id: teamMemberId,
      p_payload: payload as Json,
    },
  );

  if (error) {
    throw new Error(
      `Failed to log interaction: ${error.message}. Apply supabase/migrations/20260605120000_client_contacts_rpcs.sql`,
    );
  }

  if (!data) {
    throw new Error("Failed to log interaction: no id returned.");
  }

  return data;
}

export async function updateInteractionWithTeamMemberContext(
  teamMemberId: string,
  interactionId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await pmRpc(
    supabase,
    "update_interaction_with_team_member_context",
    {
      p_team_member_id: teamMemberId,
      p_interaction_id: interactionId,
      p_payload: payload as Json,
    },
  );

  if (error) {
    throw new Error(
      `Failed to update interaction: ${error.message}. Apply supabase/migrations/20260620150000_update_delete_interaction_rpcs.sql`,
    );
  }
}

export async function deleteInteractionWithTeamMemberContext(
  teamMemberId: string,
  interactionId: string,
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await pmRpc(
    supabase,
    "delete_interaction_with_team_member_context",
    {
      p_team_member_id: teamMemberId,
      p_interaction_id: interactionId,
    },
  );

  if (error) {
    throw new Error(
      `Failed to delete interaction: ${error.message}. Apply supabase/migrations/20260620150000_update_delete_interaction_rpcs.sql`,
    );
  }
}

export async function insertProjectWithTeamMemberContext(
  teamMemberId: string,
  project: Record<string, unknown>,
): Promise<string> {
  const supabase = createServiceClient();

  const { data, error } = await pmRpc<string>(
    supabase,
    "insert_project_with_team_member_context",
    {
      p_team_member_id: teamMemberId,
      p_project: project as Json,
    },
  );

  if (error) {
    throw new Error(
      `Failed to create project: ${error.message}. Apply supabase/migrations/20260606120000_project_rpcs.sql`,
    );
  }

  if (!data) {
    throw new Error("Failed to create project: no id returned.");
  }

  return data;
}

export async function updateTaskSectionWithTeamMemberContext(
  teamMemberId: string,
  taskId: string,
  sectionId: string,
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await pmRpc(
    supabase,
    "update_task_section_with_team_member_context",
    {
      p_team_member_id: teamMemberId,
      p_task_id: taskId,
      p_section_id: sectionId,
    },
  );

  if (error) {
    throw new Error(
      `Failed to move task: ${error.message}. Apply supabase/migrations/20260606120000_project_rpcs.sql`,
    );
  }
}

export async function insertMilestoneWithTeamMemberContext(
  teamMemberId: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const supabase = createServiceClient();

  const { data, error } = await pmRpc<string>(
    supabase,
    "insert_milestone_with_team_member_context",
    {
      p_team_member_id: teamMemberId,
      p_payload: payload as Json,
    },
  );

  if (error) {
    throw new Error(
      `Failed to create milestone: ${error.message}. Apply supabase/migrations/20260606120000_project_rpcs.sql`,
    );
  }

  if (!data) {
    throw new Error("Failed to create milestone: no id returned.");
  }

  return data;
}

export async function updateMilestoneWithTeamMemberContext(
  teamMemberId: string,
  milestoneId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await pmRpc(
    supabase,
    "update_milestone_with_team_member_context",
    {
      p_team_member_id: teamMemberId,
      p_milestone_id: milestoneId,
      p_payload: payload as Json,
    },
  );

  if (error) {
    throw new Error(
      `Failed to update milestone: ${error.message}. Apply supabase/migrations/20260606120000_project_rpcs.sql`,
    );
  }
}

export async function insertProjectMemberWithTeamMemberContext(
  teamMemberId: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const supabase = createServiceClient();

  const { data, error } = await pmRpc<string>(
    supabase,
    "insert_project_member_with_team_member_context",
    {
      p_team_member_id: teamMemberId,
      p_payload: payload as Json,
    },
  );

  if (error) {
    throw new Error(
      `Failed to add member: ${error.message}. Apply supabase/migrations/20260606120000_project_rpcs.sql`,
    );
  }

  if (!data) {
    throw new Error("Failed to add member: no id returned.");
  }

  return data;
}

export async function deleteProjectMemberWithTeamMemberContext(
  teamMemberId: string,
  memberId: string,
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await pmRpc(
    supabase,
    "delete_project_member_with_team_member_context",
    {
      p_team_member_id: teamMemberId,
      p_member_id: memberId,
    },
  );

  if (error) {
    throw new Error(
      `Failed to remove member: ${error.message}. Apply supabase/migrations/20260606120000_project_rpcs.sql`,
    );
  }
}

const TASK_RPC_HINT =
  "Apply supabase/migrations/20260607120000_task_rpcs.sql";

export async function insertTaskWithTeamMemberContext(
  teamMemberId: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await pmRpc<string>(
    supabase,
    "insert_task_with_team_member_context",
    { p_team_member_id: teamMemberId, p_payload: payload as Json },
  );
  if (error) throw new Error(`Failed to create task: ${error.message}. ${TASK_RPC_HINT}`);
  if (!data) throw new Error("Failed to create task: no id returned.");
  return data;
}

export async function updateTaskWithTeamMemberContext(
  teamMemberId: string,
  taskId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await pmRpc(supabase, "update_task_with_team_member_context", {
    p_team_member_id: teamMemberId,
    p_task_id: taskId,
    p_payload: payload as Json,
  });
  if (error) throw new Error(`Failed to update task: ${error.message}. ${TASK_RPC_HINT}`);
}

export async function deleteTaskWithTeamMemberContext(
  teamMemberId: string,
  taskId: string,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await pmRpc(supabase, "delete_task_with_team_member_context", {
    p_team_member_id: teamMemberId,
    p_task_id: taskId,
  });
  if (error) throw new Error(`Failed to delete task: ${error.message}. ${TASK_RPC_HINT}`);
}

export async function insertTaskCommentWithTeamMemberContext(
  teamMemberId: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await pmRpc<string>(
    supabase,
    "insert_task_comment_with_team_member_context",
    { p_team_member_id: teamMemberId, p_payload: payload as Json },
  );
  if (error) throw new Error(`Failed to add comment: ${error.message}. ${TASK_RPC_HINT}`);
  if (!data) throw new Error("Failed to add comment: no id returned.");
  return data;
}

export async function deleteTaskCommentWithTeamMemberContext(
  teamMemberId: string,
  commentId: string,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await pmRpc(
    supabase,
    "delete_task_comment_with_team_member_context",
    { p_team_member_id: teamMemberId, p_comment_id: commentId },
  );
  if (error) throw new Error(`Failed to delete comment: ${error.message}. ${TASK_RPC_HINT}`);
}

export async function insertTimeEntryWithTeamMemberContext(
  teamMemberId: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await pmRpc<string>(
    supabase,
    "insert_time_entry_with_team_member_context",
    { p_team_member_id: teamMemberId, p_payload: payload as Json },
  );
  if (error) throw new Error(`Failed to log time: ${error.message}. ${TASK_RPC_HINT}`);
  if (!data) throw new Error("Failed to log time: no id returned.");
  return data;
}

export async function deleteTimeEntryWithTeamMemberContext(
  teamMemberId: string,
  entryId: string,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await pmRpc(
    supabase,
    "delete_time_entry_with_team_member_context",
    { p_team_member_id: teamMemberId, p_entry_id: entryId },
  );
  if (error) throw new Error(`Failed to delete time entry: ${error.message}. ${TASK_RPC_HINT}`);
}

export async function insertTaskDependencyWithTeamMemberContext(
  teamMemberId: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await pmRpc<string>(
    supabase,
    "insert_task_dependency_with_team_member_context",
    { p_team_member_id: teamMemberId, p_payload: payload as Json },
  );
  if (error) throw new Error(`Failed to add dependency: ${error.message}. ${TASK_RPC_HINT}`);
  if (!data) throw new Error("Failed to add dependency: no id returned.");
  return data;
}

export async function deleteTaskDependencyWithTeamMemberContext(
  teamMemberId: string,
  dependencyId: string,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await pmRpc(
    supabase,
    "delete_task_dependency_with_team_member_context",
    { p_team_member_id: teamMemberId, p_dependency_id: dependencyId },
  );
  if (error) throw new Error(`Failed to remove dependency: ${error.message}. ${TASK_RPC_HINT}`);
}

const TEAM_RPC_HINT =
  "Apply supabase/migrations/20260609120000_team_rpcs.sql";

export async function updateTeamMemberAvailabilityWithTeamMemberContext(
  teamMemberId: string,
  targetMemberId: string,
  isAvailable: boolean,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await pmRpc(
    supabase,
    "update_team_member_availability_with_team_member_context",
    {
      p_team_member_id: teamMemberId,
      p_target_member_id: targetMemberId,
      p_is_available: isAvailable,
    },
  );
  if (error) {
    throw new Error(
      `Failed to update availability: ${error.message}. ${TEAM_RPC_HINT}`,
    );
  }
}

export async function upsertPlatformConnectionWithTeamMemberContext(
  teamMemberId: string,
  clientId: string,
  platform: string,
  externalAccountId: string,
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase.rpc("upsert_platform_connection", {
    p_team_member_id: teamMemberId,
    p_client_id: clientId,
    p_platform: platform,
    p_external_account_id: externalAccountId,
  });

  if (error) {
    throw new Error(
      `Failed to save platform connection: ${error.message}. Apply supabase/migrations/20260613120000_client_overview_custom_fields.sql`,
    );
  }
}

const TEMPLATE_RPC_HINT =
  "Apply supabase/migrations/20260616120000_project_templates_app.sql";

export async function insertProjectTemplateWithTeamMemberContext(
  teamMemberId: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await pmRpc<string>(
    supabase,
    "insert_project_template_with_team_member_context",
    { p_team_member_id: teamMemberId, p_payload: payload as Json },
  );
  if (error) throw new Error(`Failed to create template: ${error.message}. ${TEMPLATE_RPC_HINT}`);
  if (!data) throw new Error("Failed to create template: no id returned.");
  return data;
}

export async function updateProjectTemplateWithTeamMemberContext(
  teamMemberId: string,
  templateId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await pmRpc(supabase, "update_project_template_with_team_member_context", {
    p_team_member_id: teamMemberId,
    p_template_id: templateId,
    p_payload: payload as Json,
  });
  if (error) throw new Error(`Failed to update template: ${error.message}. ${TEMPLATE_RPC_HINT}`);
}

export async function deleteProjectTemplateWithTeamMemberContext(
  teamMemberId: string,
  templateId: string,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await pmRpc(supabase, "delete_project_template_with_team_member_context", {
    p_team_member_id: teamMemberId,
    p_template_id: templateId,
  });
  if (error) throw new Error(`Failed to delete template: ${error.message}. ${TEMPLATE_RPC_HINT}`);
}

export async function duplicateProjectTemplateWithTeamMemberContext(
  teamMemberId: string,
  templateId: string,
): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await pmRpc<string>(
    supabase,
    "duplicate_project_template_with_team_member_context",
    { p_team_member_id: teamMemberId, p_template_id: templateId },
  );
  if (error) throw new Error(`Failed to duplicate template: ${error.message}. ${TEMPLATE_RPC_HINT}`);
  if (!data) throw new Error("Failed to duplicate template: no id returned.");
  return data;
}

export async function insertProjectTemplateSectionWithTeamMemberContext(
  teamMemberId: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await pmRpc<string>(
    supabase,
    "insert_project_template_section_with_team_member_context",
    { p_team_member_id: teamMemberId, p_payload: payload as Json },
  );
  if (error) throw new Error(`Failed to add section: ${error.message}. ${TEMPLATE_RPC_HINT}`);
  if (!data) throw new Error("Failed to add section: no id returned.");
  return data;
}

export async function updateProjectTemplateSectionWithTeamMemberContext(
  teamMemberId: string,
  sectionId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await pmRpc(
    supabase,
    "update_project_template_section_with_team_member_context",
    {
      p_team_member_id: teamMemberId,
      p_section_id: sectionId,
      p_payload: payload as Json,
    },
  );
  if (error) throw new Error(`Failed to update section: ${error.message}. ${TEMPLATE_RPC_HINT}`);
}

export async function deleteProjectTemplateSectionWithTeamMemberContext(
  teamMemberId: string,
  sectionId: string,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await pmRpc(
    supabase,
    "delete_project_template_section_with_team_member_context",
    { p_team_member_id: teamMemberId, p_section_id: sectionId },
  );
  if (error) throw new Error(`Failed to delete section: ${error.message}. ${TEMPLATE_RPC_HINT}`);
}

export async function insertProjectTemplateTaskWithTeamMemberContext(
  teamMemberId: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await pmRpc<string>(
    supabase,
    "insert_project_template_task_with_team_member_context",
    { p_team_member_id: teamMemberId, p_payload: payload as Json },
  );
  if (error) throw new Error(`Failed to add task: ${error.message}. ${TEMPLATE_RPC_HINT}`);
  if (!data) throw new Error("Failed to add task: no id returned.");
  return data;
}

export async function updateProjectTemplateTaskWithTeamMemberContext(
  teamMemberId: string,
  taskId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await pmRpc(
    supabase,
    "update_project_template_task_with_team_member_context",
    {
      p_team_member_id: teamMemberId,
      p_task_id: taskId,
      p_payload: payload as Json,
    },
  );
  if (error) throw new Error(`Failed to update task: ${error.message}. ${TEMPLATE_RPC_HINT}`);
}

export async function deleteProjectTemplateTaskWithTeamMemberContext(
  teamMemberId: string,
  taskId: string,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await pmRpc(
    supabase,
    "delete_project_template_task_with_team_member_context",
    { p_team_member_id: teamMemberId, p_task_id: taskId },
  );
  if (error) throw new Error(`Failed to delete task: ${error.message}. ${TEMPLATE_RPC_HINT}`);
}

export async function applyProjectTemplateWithTeamMemberContext(
  teamMemberId: string,
  projectId: string,
  templateId: string,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await pmRpc(
    supabase,
    "apply_project_template_with_team_member_context",
    {
      p_team_member_id: teamMemberId,
      p_project_id: projectId,
      p_template_id: templateId,
    },
  );
  if (error) throw new Error(`Failed to apply template: ${error.message}. ${TEMPLATE_RPC_HINT}`);
}
