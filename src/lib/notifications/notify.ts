import { revalidatePath } from "next/cache";
import { resolveMentionedTeamMemberIds } from "@/lib/notifications/mentions";
import { safeCreateNotification } from "@/lib/notifications/create";
import { getProjectOwnerContext } from "@/lib/queries/projects";
import { pm } from "@/lib/supabase/pm";
import { createServiceClient } from "@/lib/supabase/service";

function revalidateNotificationBell() {
  revalidatePath("/", "layout");
}

async function loadActiveTeamMembers() {
  const service = createServiceClient();
  const { data, error } = await pm(service)
    .from("team_members")
    .select("id, name, email")
    .eq("is_active", true);

  if (error) {
    console.error("[loadActiveTeamMembers]", error.message);
    return [];
  }

  return data ?? [];
}

export async function notifyTaskAssigned(params: {
  assigneeId: string;
  actorId: string;
  actorName: string;
  taskId: string;
  taskTitle: string;
}) {
  await safeCreateNotification({
    recipientId: params.assigneeId,
    actorId: params.actorId,
    type: "task_assigned",
    entityType: "task",
    entityId: params.taskId,
    title: "Task assigned to you",
    body: `${params.actorName} assigned "${params.taskTitle}" to you.`,
  });
  revalidateNotificationBell();
}

export async function notifyTaskComment(params: {
  taskId: string;
  taskTitle: string;
  assigneeId: string | null;
  actorId: string;
  actorName: string;
  commentBody: string;
}) {
  const teamMembers = await loadActiveTeamMembers();
  const mentionedIds = new Set(
    resolveMentionedTeamMemberIds(params.commentBody, teamMembers),
  );

  let sent = false;

  if (
    params.assigneeId &&
    params.assigneeId !== params.actorId &&
    !mentionedIds.has(params.assigneeId)
  ) {
    await safeCreateNotification({
      recipientId: params.assigneeId,
      actorId: params.actorId,
      type: "comment_mention",
      entityType: "task",
      entityId: params.taskId,
      title: `New comment on "${params.taskTitle}"`,
      body: `${params.actorName} commented on your task.`,
    });
    sent = true;
  }

  mentionedIds.delete(params.actorId);
  if (params.assigneeId) {
    mentionedIds.delete(params.assigneeId);
  }

  for (const recipientId of mentionedIds) {
    await safeCreateNotification({
      recipientId,
      actorId: params.actorId,
      type: "comment_mention",
      entityType: "task",
      entityId: params.taskId,
      title: `You were mentioned on "${params.taskTitle}"`,
      body: `${params.actorName} mentioned you in a comment.`,
    });
    sent = true;
  }

  if (sent) {
    revalidateNotificationBell();
  }
}

export async function notifyTaskReadyForReview(params: {
  taskId: string;
  taskTitle: string;
  projectId: string;
  assigneeId: string | null;
  actorId: string;
  actorName: string;
}) {
  const project = await getProjectOwnerContext(params.projectId);
  if (!project) return;

  const title = `Task ready for review: ${params.taskTitle}`;
  const body = `${params.actorName} marked "${params.taskTitle}" as In Review in ${project.projectName}. Please review and mark as complete.`;

  let sent = false;

  if (project.ownerId && project.ownerId !== params.actorId) {
    await safeCreateNotification({
      recipientId: project.ownerId,
      actorId: params.actorId,
      type: "task_review",
      entityType: "task",
      entityId: params.taskId,
      title,
      body,
    });
    sent = true;
  }

  if (
    params.assigneeId &&
    params.assigneeId !== params.actorId &&
    params.assigneeId !== project.ownerId
  ) {
    await safeCreateNotification({
      recipientId: params.assigneeId,
      actorId: params.actorId,
      type: "task_review",
      entityType: "task",
      entityId: params.taskId,
      title,
      body,
    });
    sent = true;
  }

  if (sent) {
    revalidateNotificationBell();
  }
}

export async function notifyClientInteractionLogged(params: {
  clientId: string;
  interactionId: string;
  actorId: string;
  actorName: string;
  summary: string;
}) {
  const service = createServiceClient();
  const { data: client, error } = await service
    .from("clients")
    .select("name, account_manager_id")
    .eq("id", params.clientId)
    .maybeSingle();

  if (error || !client?.account_manager_id) return;

  await safeCreateNotification({
    recipientId: client.account_manager_id,
    actorId: params.actorId,
    type: "comment_mention",
    entityType: "client",
    entityId: params.clientId,
    title: `Interaction logged: ${client.name ?? "Client"}`,
    body: `${params.actorName} logged "${params.summary}".`,
  });
  revalidateNotificationBell();
}

export async function notifyMilestoneCreated(params: {
  projectId: string;
  milestoneTitle: string;
  actorId: string;
  actorName: string;
}) {
  const service = createServiceClient();
  const { data: project, error } = await pm(service)
    .from("projects")
    .select("name, owner_id")
    .eq("id", params.projectId)
    .maybeSingle();

  if (error || !project?.owner_id) return;

  await safeCreateNotification({
    recipientId: project.owner_id,
    actorId: params.actorId,
    type: "milestone_due",
    entityType: "project",
    entityId: params.projectId,
    title: "New milestone added",
    body: `${params.actorName} added "${params.milestoneTitle}" on ${project.name ?? "a project"}.`,
  });
  revalidateNotificationBell();
}

export async function notifyMilestoneCompleted(params: {
  projectId: string;
  milestoneId: string;
  milestoneTitle: string;
  actorId: string;
  actorName: string;
}) {
  const service = createServiceClient();
  const { data: project, error } = await pm(service)
    .from("projects")
    .select("name, owner_id")
    .eq("id", params.projectId)
    .maybeSingle();

  if (error || !project?.owner_id) return;

  await safeCreateNotification({
    recipientId: project.owner_id,
    actorId: params.actorId,
    type: "task_complete",
    entityType: "milestone",
    entityId: params.milestoneId,
    title: "Milestone completed",
    body: `${params.actorName} completed "${params.milestoneTitle}" on ${project.name ?? "a project"}.`,
  });
  revalidateNotificationBell();
}
