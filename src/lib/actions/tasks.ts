"use server";

import { revalidatePath } from "next/cache";
import { getTeamMember } from "@/lib/auth/session";
import { getTaskDetail } from "@/lib/queries/tasks";
import {
  deleteTaskCommentWithTeamMemberContext,
  deleteTaskDependencyWithTeamMemberContext,
  deleteTaskWithTeamMemberContext,
  deleteTimeEntryWithTeamMemberContext,
  insertTaskCommentWithTeamMemberContext,
  insertTaskDependencyWithTeamMemberContext,
  insertTaskWithTeamMemberContext,
  insertTimeEntryWithTeamMemberContext,
  updateTaskWithTeamMemberContext,
} from "@/lib/supabase/with-team-member-context";
import {
  addDependencySchema,
  createCommentSchema,
  createTaskSchema,
  logTimeSchema,
  quickAddTaskSchema,
  updateTaskSchema,
} from "@/lib/validations/task";
import type { z } from "zod";

export type TaskFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  taskId?: string;
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

function revalidateTaskPaths(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/tasks");
}

export async function loadTaskDetail(taskId: string) {
  return getTaskDetail(taskId);
}

export async function createTask(
  _prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const raw = Object.fromEntries(formData.entries());
  console.log("[createTask] called with:", JSON.stringify(raw));

  try {
    const teamMember = await requireTeamMember();
    const isQuickAdd = formData.get("_quick_add") === "true";

    const parsed = isQuickAdd
      ? quickAddTaskSchema.safeParse({
          project_id: formData.get("project_id"),
          section_id: formData.get("section_id"),
          title: formData.get("title"),
          priority: formData.get("priority"),
          assignee_id: formData.get("assignee_id"),
          due_date: formData.get("due_date"),
        })
      : createTaskSchema.safeParse({
          project_id: formData.get("project_id"),
          section_id: formData.get("section_id"),
          parent_task_id: formData.get("parent_task_id"),
          title: formData.get("title"),
          description: formData.get("description"),
          priority: formData.get("priority"),
          assignee_id: formData.get("assignee_id"),
          due_date: formData.get("due_date"),
          estimated_hours: formData.get("estimated_hours"),
          status: formData.get("status"),
        });

    if (!parsed.success) {
      console.log(
        "[createTask] validation failed:",
        JSON.stringify(parsed.error.flatten()),
      );
      return {
        error: parsed.error.issues[0]?.message ?? "Invalid task details.",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    const data = parsed.data;
    console.log("[createTask] validated payload:", JSON.stringify(data));

    const taskId = await insertTaskWithTeamMemberContext(teamMember.id, {
      project_id: data.project_id,
      section_id: data.section_id ?? null,
      parent_task_id:
        "parent_task_id" in data ? (data.parent_task_id ?? null) : null,
      title: data.title,
      description: "description" in data ? (data.description ?? null) : null,
      priority: data.priority ?? "medium",
      assignee_id: data.assignee_id ?? null,
      due_date: data.due_date ?? null,
      estimated_hours:
        "estimated_hours" in data ? (data.estimated_hours ?? null) : null,
      status: "status" in data ? (data.status ?? null) : null,
    });

    console.log("[createTask] created task id:", taskId);

    revalidateTaskPaths(data.project_id);
    return { success: true, taskId };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create task.";
    console.error("[createTask] error:", message);
    return { error: message };
  }
}

export async function updateTask(
  taskId: string,
  projectId: string,
  updates: Record<string, unknown>,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = updateTaskSchema.safeParse(updates);

    if (!parsed.success) {
      return { error: "Invalid field value." };
    }

    if (Object.keys(parsed.data).length === 0) {
      return { error: "No fields to update." };
    }

    await updateTaskWithTeamMemberContext(
      teamMember.id,
      taskId,
      parsed.data as Record<string, unknown>,
    );
    revalidateTaskPaths(projectId);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update task.",
    };
  }
}

export async function updateTaskRecurrence(
  taskId: string,
  projectId: string,
  isRecurring: boolean,
  rule: Record<string, unknown> | null,
): Promise<{ error?: string }> {
  const recurrence_rule =
    isRecurring && rule ? JSON.stringify(rule) : null;

  return updateTask(taskId, projectId, {
    is_recurring: isRecurring,
    recurrence_rule,
  });
}

export async function deleteTask(
  taskId: string,
  projectId: string,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    await deleteTaskWithTeamMemberContext(teamMember.id, taskId);
    revalidateTaskPaths(projectId);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete task.",
    };
  }
}

export async function createComment(
  taskId: string,
  projectId: string,
  _prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = createCommentSchema.safeParse({
      body: formData.get("body"),
    });

    if (!parsed.success) {
      return { fieldErrors: zodFieldErrors(parsed.error) };
    }

    await insertTaskCommentWithTeamMemberContext(teamMember.id, {
      task_id: taskId,
      body: parsed.data.body,
    });

    revalidateTaskPaths(projectId);
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to add comment.",
    };
  }
}

export async function deleteComment(
  taskId: string,
  projectId: string,
  commentId: string,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    await deleteTaskCommentWithTeamMemberContext(teamMember.id, commentId);
    revalidateTaskPaths(projectId);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete comment.",
    };
  }
}

export async function logTime(
  taskId: string,
  projectId: string,
  _prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = logTimeSchema.safeParse({
      hours: formData.get("hours"),
      minutes: formData.get("minutes"),
      billable: formData.get("billable"),
      logged_date: formData.get("logged_date"),
      description: formData.get("description"),
    });

    if (!parsed.success) {
      return { fieldErrors: zodFieldErrors(parsed.error) };
    }

    await insertTimeEntryWithTeamMemberContext(teamMember.id, {
      task_id: taskId,
      hours: parsed.data.hours,
      minutes: parsed.data.minutes,
      billable: parsed.data.billable ?? true,
      logged_date: parsed.data.logged_date,
      description: parsed.data.description ?? null,
    });

    revalidateTaskPaths(projectId);
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to log time.",
    };
  }
}

export async function deleteTimeEntry(
  taskId: string,
  projectId: string,
  entryId: string,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    await deleteTimeEntryWithTeamMemberContext(teamMember.id, entryId);
    revalidateTaskPaths(projectId);
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to delete time entry.",
    };
  }
}

export async function addDependency(
  taskId: string,
  projectId: string,
  dependsOnTaskId: string,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = addDependencySchema.safeParse({
      depends_on_task_id: dependsOnTaskId,
    });

    if (!parsed.success) {
      return { error: "Invalid dependency." };
    }

    await insertTaskDependencyWithTeamMemberContext(teamMember.id, {
      task_id: taskId,
      depends_on_task_id: parsed.data.depends_on_task_id,
    });

    revalidateTaskPaths(projectId);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to add dependency.",
    };
  }
}

export async function removeDependency(
  taskId: string,
  projectId: string,
  dependencyId: string,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    await deleteTaskDependencyWithTeamMemberContext(
      teamMember.id,
      dependencyId,
    );
    revalidateTaskPaths(projectId);
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to remove dependency.",
    };
  }
}
