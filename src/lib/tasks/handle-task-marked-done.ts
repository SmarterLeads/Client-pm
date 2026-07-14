import {
  notifyTaskCompletedNeedsReview,
  notifyTaskCompletedToProjectMembers,
} from "@/lib/notifications/notify";
import { pm } from "@/lib/supabase/pm";
import { createServiceClient } from "@/lib/supabase/service";
import { isTaskReviewerEmail } from "@/lib/tasks/reviewers";
import type { TeamMember } from "@/lib/types";

export async function handleTaskMarkedDone(params: {
  teamMember: Pick<TeamMember, "id" | "name" | "email">;
  taskId: string;
  projectId: string;
  taskTitle: string;
  assigneeId: string | null;
}) {
  const service = createServiceClient();
  let assigneeName = params.teamMember.name;

  if (params.assigneeId) {
    const { data: assignee } = await pm(service)
      .from("team_members")
      .select("name")
      .eq("id", params.assigneeId)
      .maybeSingle();
    if (assignee?.name) {
      assigneeName = assignee.name;
    }
  }

  await notifyTaskCompletedToProjectMembers({
    taskId: params.taskId,
    taskTitle: params.taskTitle,
    projectId: params.projectId,
    actorId: params.teamMember.id,
    actorName: params.teamMember.name,
  });

  if (!isTaskReviewerEmail(params.teamMember.email)) {
    await notifyTaskCompletedNeedsReview({
      taskId: params.taskId,
      taskTitle: params.taskTitle,
      projectId: params.projectId,
      assigneeName,
      actorId: params.teamMember.id,
    });
  }
}
