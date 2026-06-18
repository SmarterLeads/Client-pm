"use server";

import { revalidatePath } from "next/cache";
import { canManageTeam } from "@/lib/auth/roles";
import { getTeamMember } from "@/lib/auth/session";
import { notifyTaskAssigned } from "@/lib/notifications/notify";
import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";
import {
  updateTaskWithTeamMemberContext,
  updateTeamMemberAvailabilityWithTeamMemberContext,
} from "@/lib/supabase/with-team-member-context";

async function requireManagerOrAdmin() {
  const teamMember = await getTeamMember();
  if (!teamMember) {
    throw new Error("You must be signed in as a team member.");
  }
  if (!canManageTeam(teamMember.role)) {
    throw new Error("Only admins and managers can perform this action.");
  }
  return teamMember;
}

function revalidateTeamPaths(projectIds: string[]) {
  revalidatePath("/team");
  revalidatePath("/tasks");
  revalidatePath("/projects");
  for (const projectId of projectIds) {
    revalidatePath(`/projects/${projectId}`);
  }
}

export async function setTeamMemberAvailability(
  memberId: string,
  isAvailable: boolean,
): Promise<{ error?: string }> {
  try {
    const actor = await requireManagerOrAdmin();
    await updateTeamMemberAvailabilityWithTeamMemberContext(
      actor.id,
      memberId,
      isAvailable,
    );
    revalidatePath("/team");
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to update availability.",
    };
  }
}

export async function reassignTasks(
  taskIds: string[],
  newAssigneeId: string,
): Promise<{ error?: string; reassigned?: number }> {
  try {
    const actor = await requireManagerOrAdmin();

    if (taskIds.length === 0) {
      return { error: "Select at least one task to reassign." };
    }

    const supabase = await createClient();
    const { data: tasks, error: fetchError } = await pm(supabase)
      .from("tasks")
      .select("id, title, project_id, assignee_id")
      .in("id", taskIds);

    if (fetchError) {
      return { error: fetchError.message };
    }

    if (!tasks?.length) {
      return { error: "No tasks found." };
    }

    const { data: assignee, error: assigneeError } = await pm(supabase)
      .from("team_members")
      .select("id, name")
      .eq("id", newAssigneeId)
      .eq("is_active", true)
      .maybeSingle();

    if (assigneeError || !assignee) {
      return { error: "Assignee not found." };
    }

    const projectIds = new Set<string>();

    for (const task of tasks) {
      if (task.assignee_id === newAssigneeId) continue;

      await updateTaskWithTeamMemberContext(actor.id, task.id, {
        assignee_id: newAssigneeId,
      });

      projectIds.add(task.project_id);

      await notifyTaskAssigned({
        assigneeId: newAssigneeId,
        actorId: actor.id,
        actorName: actor.name,
        taskId: task.id,
        taskTitle: task.title,
      });
    }

    revalidateTeamPaths([...projectIds]);
    return { reassigned: tasks.length };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to reassign tasks.",
    };
  }
}
