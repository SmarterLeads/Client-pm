"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTeamMember } from "@/lib/auth/session";
import {
  addMeetingParticipantWithTeamMemberContext,
  deleteInternalTaskWithTeamMemberContext,
  deleteMeetingWithTeamMemberContext,
  insertInternalProjectWithTeamMemberContext,
  insertInternalSectionWithTeamMemberContext,
  insertInternalTaskWithTeamMemberContext,
  insertMeetingWithTeamMemberContext,
  removeMeetingParticipantWithTeamMemberContext,
  updateInternalProjectWithTeamMemberContext,
  updateInternalTaskSectionWithTeamMemberContext,
  updateInternalTaskWithTeamMemberContext,
  updateMeetingWithTeamMemberContext,
} from "@/lib/supabase/with-team-member-context";
import {
  createInternalProjectSchema,
  createInternalSectionSchema,
  createInternalTaskSchema,
  createMeetingSchema,
  moveInternalTaskSectionSchema,
  updateInternalProjectSchema,
  updateInternalTaskSchema,
  updateMeetingSchema,
} from "@/lib/validations/internal";
import type { z } from "zod";

export type InternalFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  id?: string;
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

function canManageMeeting(
  teamMember: { id: string; role: string },
  createdBy: string,
) {
  return teamMember.role === "admin" || teamMember.id === createdBy;
}

function revalidateInternalProject(projectId: string) {
  revalidatePath(`/internal/projects/${projectId}`);
  revalidatePath("/internal/projects");
}

export async function createInternalProject(
  _prevState: InternalFormState,
  formData: FormData,
): Promise<InternalFormState> {
  const teamMember = await requireTeamMember();

  const parsed = createInternalProjectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    owner_id: formData.get("owner_id"),
    status: formData.get("status") || "planned",
    rag_status: formData.get("rag_status") || "green",
    start_date: formData.get("start_date"),
    due_date: formData.get("due_date"),
  });

  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) };
  }

  try {
    const projectId = await insertInternalProjectWithTeamMemberContext(
      teamMember.id,
      parsed.data,
    );
    revalidatePath("/internal/projects");
    redirect(`/internal/projects/${projectId}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return {
      error:
        err instanceof Error ? err.message : "Failed to create internal project.",
    };
  }
}

export async function updateInternalProject(
  projectId: string,
  updates: Record<string, unknown>,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = updateInternalProjectSchema.safeParse(updates);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid project data." };
    }

    await updateInternalProjectWithTeamMemberContext(
      teamMember.id,
      projectId,
      parsed.data,
    );
    revalidateInternalProject(projectId);
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to update internal project.",
    };
  }
}

export async function createInternalSection(
  _prevState: InternalFormState,
  formData: FormData,
): Promise<InternalFormState> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = createInternalSectionSchema.safeParse({
      project_id: formData.get("project_id"),
      name: formData.get("name"),
    });

    if (!parsed.success) {
      return { fieldErrors: zodFieldErrors(parsed.error) };
    }

    const sectionId = await insertInternalSectionWithTeamMemberContext(
      teamMember.id,
      parsed.data,
    );
    revalidateInternalProject(parsed.data.project_id);
    return { success: true, id: sectionId };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to create section.",
    };
  }
}

export async function moveInternalTaskSection(
  projectId: string,
  taskId: string,
  sectionId: string,
): Promise<{ error?: string }> {
  const parsed = moveInternalTaskSectionSchema.safeParse({
    task_id: taskId,
    section_id: sectionId,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid move." };
  }

  try {
    const teamMember = await requireTeamMember();
    await updateInternalTaskSectionWithTeamMemberContext(
      teamMember.id,
      taskId,
      sectionId,
    );
    revalidateInternalProject(projectId);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to move task.",
    };
  }
}

export async function createInternalTask(
  _prevState: InternalFormState,
  formData: FormData,
): Promise<InternalFormState> {
  try {
    const teamMember = await requireTeamMember();
    const status = formData.get("status") || "todo";
    const isRecurring = formData.get("is_recurring") === "true";

    const parsed = createInternalTaskSchema.safeParse({
      project_id: formData.get("project_id"),
      section_id: formData.get("section_id"),
      parent_task_id: formData.get("parent_task_id"),
      title: formData.get("title"),
      description: formData.get("description"),
      priority: formData.get("priority"),
      assignee_id: formData.get("assignee_id"),
      due_date: formData.get("due_date"),
      estimated_hours: formData.get("estimated_hours"),
      status,
      is_recurring: isRecurring,
      recurrence_rule: isRecurring ? formData.get("recurrence_rule") : null,
    });

    if (!parsed.success) {
      return { fieldErrors: zodFieldErrors(parsed.error) };
    }

    const data = parsed.data;
    const taskId = await insertInternalTaskWithTeamMemberContext(teamMember.id, {
      ...data,
      is_recurring: isRecurring,
      recurrence_rule:
        isRecurring && data.recurrence_rule ? data.recurrence_rule : null,
    });

    revalidateInternalProject(data.project_id);
    return { success: true, id: taskId };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to create task.",
    };
  }
}

export async function updateInternalTask(
  taskId: string,
  projectId: string,
  updates: Record<string, unknown>,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = updateInternalTaskSchema.safeParse(updates);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid task data." };
    }

    await updateInternalTaskWithTeamMemberContext(
      teamMember.id,
      taskId,
      parsed.data,
    );
    revalidateInternalProject(projectId);
    revalidatePath("/tasks");
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update task.",
    };
  }
}

export async function deleteInternalTask(
  taskId: string,
  projectId: string,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    await deleteInternalTaskWithTeamMemberContext(teamMember.id, taskId);
    revalidateInternalProject(projectId);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete task.",
    };
  }
}

export async function createMeeting(
  _prevState: InternalFormState,
  formData: FormData,
): Promise<InternalFormState> {
  try {
    const teamMember = await requireTeamMember();
    const participantRaw = formData.getAll("participant_ids");
    const participant_ids = participantRaw
      .map(String)
      .filter((id) => id.trim().length > 0);

    const occurredAtRaw = String(formData.get("occurred_at") ?? "");
    const occurred_at = occurredAtRaw
      ? new Date(occurredAtRaw).toISOString()
      : new Date().toISOString();

    const parsed = createMeetingSchema.safeParse({
      title: formData.get("title"),
      type: formData.get("type") || "team_meeting",
      occurred_at,
      summary: formData.get("summary"),
      body: formData.get("body"),
      visibility: formData.get("visibility") || "all",
      participant_ids,
    });

    if (!parsed.success) {
      return { fieldErrors: zodFieldErrors(parsed.error) };
    }

    const meetingId = await insertMeetingWithTeamMemberContext(
      teamMember.id,
      parsed.data,
    );
    revalidatePath("/internal/meetings");
    return { success: true, id: meetingId };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to log meeting.",
    };
  }
}

export async function updateMeeting(
  meetingId: string,
  createdBy: string,
  updates: Record<string, unknown>,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    if (!canManageMeeting(teamMember, createdBy)) {
      return { error: "You do not have permission to edit this meeting." };
    }

    const parsed = updateMeetingSchema.safeParse(updates);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid meeting data." };
    }

    await updateMeetingWithTeamMemberContext(
      teamMember.id,
      meetingId,
      parsed.data,
    );
    revalidatePath("/internal/meetings");
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update meeting.",
    };
  }
}

export async function deleteMeeting(
  meetingId: string,
  createdBy: string,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    if (!canManageMeeting(teamMember, createdBy)) {
      return { error: "You do not have permission to delete this meeting." };
    }

    await deleteMeetingWithTeamMemberContext(teamMember.id, meetingId);
    revalidatePath("/internal/meetings");
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete meeting.",
    };
  }
}

export async function addMeetingParticipant(
  meetingId: string,
  participantId: string,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    await addMeetingParticipantWithTeamMemberContext(
      teamMember.id,
      meetingId,
      participantId,
    );
    revalidatePath("/internal/meetings");
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to add participant.",
    };
  }
}

export async function removeMeetingParticipant(
  participantId: string,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    await removeMeetingParticipantWithTeamMemberContext(
      teamMember.id,
      participantId,
    );
    revalidatePath("/internal/meetings");
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to remove participant.",
    };
  }
}

export async function loadInternalTaskDetail(taskId: string) {
  const { getInternalTaskById } = await import("@/lib/queries/internal");
  return getInternalTaskById(taskId);
}
