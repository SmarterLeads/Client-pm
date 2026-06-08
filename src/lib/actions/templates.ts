"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTeamMember } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/roles";
import { getTemplatePreview } from "@/lib/queries/templates";
import {
  applyProjectTemplateWithTeamMemberContext,
  deleteProjectTemplateSectionWithTeamMemberContext,
  deleteProjectTemplateTaskWithTeamMemberContext,
  deleteProjectTemplateWithTeamMemberContext,
  duplicateProjectTemplateWithTeamMemberContext,
  insertProjectTemplateSectionWithTeamMemberContext,
  insertProjectTemplateTaskWithTeamMemberContext,
  insertProjectTemplateWithTeamMemberContext,
  updateProjectTemplateSectionWithTeamMemberContext,
  updateProjectTemplateTaskWithTeamMemberContext,
  updateProjectTemplateWithTeamMemberContext,
} from "@/lib/supabase/with-team-member-context";
import {
  createTemplateSchema,
  createTemplateSectionSchema,
  createTemplateTaskSchema,
  updateTemplateSchema,
  updateTemplateSectionSchema,
  updateTemplateTaskSchema,
} from "@/lib/validations/template";
import type { z } from "zod";

export type TemplateFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  templateId?: string;
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

async function requireTeamMember() {
  const teamMember = await getTeamMember();
  if (!teamMember) {
    throw new Error("You must be signed in as a team member.");
  }
  return teamMember;
}

function revalidateTemplates(templateId?: string) {
  revalidatePath("/settings/templates");
  if (templateId) {
    revalidatePath(`/settings/templates/${templateId}`);
  }
}

export async function loadTemplatePreview(templateId: string) {
  return getTemplatePreview(templateId);
}

export async function createTemplate(
  _prevState: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = createTemplateSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description"),
    });

    if (!parsed.success) {
      return { fieldErrors: zodFieldErrors(parsed.error) };
    }

    const templateId = await insertProjectTemplateWithTeamMemberContext(
      teamMember.id,
      {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        is_active: true,
      },
    );

    revalidateTemplates();
    redirect(`/settings/templates/${templateId}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return {
      error: err instanceof Error ? err.message : "Failed to create template.",
    };
  }
}

export async function updateTemplate(
  id: string,
  name: string,
  description: string | null,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = updateTemplateSchema.safeParse({ name, description });

    if (!parsed.success) {
      return { error: "Invalid template data." };
    }

    await updateProjectTemplateWithTeamMemberContext(teamMember.id, id, parsed.data);
    revalidateTemplates(id);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update template.",
    };
  }
}

export async function toggleTemplateActive(
  id: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    await updateProjectTemplateWithTeamMemberContext(teamMember.id, id, {
      is_active: isActive,
    });
    revalidateTemplates(id);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update template.",
    };
  }
}

export async function deleteTemplate(id: string): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    if (!isAdmin(teamMember.role)) {
      return { error: "Only admins can delete templates." };
    }

    await deleteProjectTemplateWithTeamMemberContext(teamMember.id, id);
    revalidateTemplates();
    redirect("/settings/templates");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return {
      error: err instanceof Error ? err.message : "Failed to delete template.",
    };
  }
}

export async function duplicateTemplate(
  id: string,
): Promise<{ error?: string; templateId?: string }> {
  try {
    const teamMember = await requireTeamMember();
    const templateId = await duplicateProjectTemplateWithTeamMemberContext(
      teamMember.id,
      id,
    );
    revalidateTemplates(templateId);
    return { templateId };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to duplicate template.",
    };
  }
}

export async function createTemplateSection(
  templateId: string,
  name: string,
  displayOrder: number,
): Promise<{ error?: string; sectionId?: string }> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = createTemplateSectionSchema.safeParse({
      template_id: templateId,
      name,
      display_order: displayOrder,
    });

    if (!parsed.success) {
      return { error: "Invalid section." };
    }

    const sectionId = await insertProjectTemplateSectionWithTeamMemberContext(
      teamMember.id,
      parsed.data,
    );
    revalidateTemplates(templateId);
    return { sectionId };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to add section.",
    };
  }
}

export async function updateTemplateSection(
  id: string,
  templateId: string,
  name: string,
  displayOrder: number,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = updateTemplateSectionSchema.safeParse({
      name,
      display_order: displayOrder,
    });

    if (!parsed.success) {
      return { error: "Invalid section." };
    }

    await updateProjectTemplateSectionWithTeamMemberContext(
      teamMember.id,
      id,
      parsed.data,
    );
    revalidateTemplates(templateId);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update section.",
    };
  }
}

export async function reorderTemplateSections(
  templateId: string,
  sectionIds: string[],
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();

    await Promise.all(
      sectionIds.map((sectionId, index) =>
        updateProjectTemplateSectionWithTeamMemberContext(
          teamMember.id,
          sectionId,
          { display_order: index },
        ),
      ),
    );

    revalidateTemplates(templateId);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to reorder sections.",
    };
  }
}

export async function deleteTemplateSection(
  templateId: string,
  sectionId: string,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    await deleteProjectTemplateSectionWithTeamMemberContext(
      teamMember.id,
      sectionId,
    );
    revalidateTemplates(templateId);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete section.",
    };
  }
}

export async function createTemplateTask(
  templateId: string,
  sectionId: string,
  data: Record<string, unknown>,
): Promise<{ error?: string; taskId?: string }> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = createTemplateTaskSchema.safeParse({
      template_id: templateId,
      section_id: sectionId,
      ...data,
    });

    if (!parsed.success) {
      return { error: "Invalid task data." };
    }

    const taskId = await insertProjectTemplateTaskWithTeamMemberContext(
      teamMember.id,
      parsed.data,
    );
    revalidateTemplates(templateId);
    return { taskId };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to add task.",
    };
  }
}

export async function updateTemplateTask(
  templateId: string,
  taskId: string,
  data: Record<string, unknown>,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = updateTemplateTaskSchema.safeParse(data);

    if (!parsed.success) {
      return { error: "Invalid task data." };
    }

    await updateProjectTemplateTaskWithTeamMemberContext(
      teamMember.id,
      taskId,
      parsed.data,
    );
    revalidateTemplates(templateId);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update task.",
    };
  }
}

export async function deleteTemplateTask(
  templateId: string,
  taskId: string,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    await deleteProjectTemplateTaskWithTeamMemberContext(
      teamMember.id,
      taskId,
    );
    revalidateTemplates(templateId);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete task.",
    };
  }
}

export async function applyTemplate(
  projectId: string,
  templateId: string,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    await applyProjectTemplateWithTeamMemberContext(
      teamMember.id,
      projectId,
      templateId,
    );
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to apply template.",
    };
  }
}
