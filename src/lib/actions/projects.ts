"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTeamMember } from "@/lib/auth/session";
import {
  deleteProjectMemberWithTeamMemberContext,
  insertMilestoneWithTeamMemberContext,
  insertProjectMemberWithTeamMemberContext,
  insertProjectWithTeamMemberContext,
  updateMilestoneWithTeamMemberContext,
  updateTaskSectionWithTeamMemberContext,
} from "@/lib/supabase/with-team-member-context";
import { applyTemplate } from "@/lib/actions/templates";
import {
  addProjectMemberSchema,
  createMilestoneSchema,
  createProjectSchema,
  moveTaskSectionSchema,
} from "@/lib/validations/project";
import type { z } from "zod";

export type ProjectFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

function zodFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = [];
    out[key].push(issue.message);
  }
  return out;
}

function emptyToNull(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value;
}

async function requireTeamMember() {
  const teamMember = await getTeamMember();
  if (!teamMember) {
    throw new Error("You must be signed in as a team member.");
  }
  return teamMember;
}

function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function createProject(
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const teamMember = await requireTeamMember();

  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    client_id: formData.get("client_id"),
    owner_id: formData.get("owner_id"),
    description: formData.get("description"),
    status: formData.get("status"),
    rag_status: formData.get("rag_status"),
    start_date: formData.get("start_date"),
    due_date: formData.get("due_date"),
    template_id: formData.get("template_id"),
  });

  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) };
  }

  try {
    const templateId = parsed.data.template_id ?? null;

    const projectId = await insertProjectWithTeamMemberContext(teamMember.id, {
      name: parsed.data.name,
      client_id: parsed.data.client_id,
      owner_id: parsed.data.owner_id ?? null,
      description: parsed.data.description ?? null,
      status: parsed.data.status,
      rag_status: parsed.data.rag_status,
      start_date: parsed.data.start_date ?? null,
      due_date: parsed.data.due_date ?? null,
      template_id: templateId,
      skip_default_sections: Boolean(templateId),
    });

    if (templateId) {
      const applyResult = await applyTemplate(projectId, templateId);
      if (applyResult.error) {
        return { error: applyResult.error };
      }
    }

    redirect(`/projects/${projectId}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return {
      error: err instanceof Error ? err.message : "Failed to create project.",
    };
  }
}

export async function moveTaskSection(
  projectId: string,
  taskId: string,
  sectionId: string,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = moveTaskSectionSchema.safeParse({
      task_id: taskId,
      section_id: sectionId,
    });

    if (!parsed.success) {
      return { error: "Invalid move." };
    }

    await updateTaskSectionWithTeamMemberContext(
      teamMember.id,
      parsed.data.task_id,
      parsed.data.section_id,
    );
    revalidateProject(projectId);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to move task.",
    };
  }
}

export async function createMilestone(
  projectId: string,
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = createMilestoneSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description"),
      target_date: emptyToNull(formData.get("target_date")),
    });

    if (!parsed.success) {
      return { fieldErrors: zodFieldErrors(parsed.error) };
    }

    await insertMilestoneWithTeamMemberContext(teamMember.id, {
      project_id: projectId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      target_date: parsed.data.target_date ?? null,
    });

    revalidateProject(projectId);
    return { success: true };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to create milestone.",
    };
  }
}

export async function toggleMilestoneComplete(
  projectId: string,
  milestoneId: string,
  completed: boolean,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    await updateMilestoneWithTeamMemberContext(teamMember.id, milestoneId, {
      completed,
    });
    revalidateProject(projectId);
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to update milestone.",
    };
  }
}

export async function addProjectMember(
  projectId: string,
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = addProjectMemberSchema.safeParse({
      team_member_id: formData.get("team_member_id"),
      role: formData.get("role"),
    });

    if (!parsed.success) {
      return { fieldErrors: zodFieldErrors(parsed.error) };
    }

    await insertProjectMemberWithTeamMemberContext(teamMember.id, {
      project_id: projectId,
      team_member_id: parsed.data.team_member_id,
      role: parsed.data.role,
    });

    revalidateProject(projectId);
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to add member.",
    };
  }
}

export async function removeProjectMember(
  projectId: string,
  memberId: string,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    await deleteProjectMemberWithTeamMemberContext(teamMember.id, memberId);
    revalidateProject(projectId);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to remove member.",
    };
  }
}
