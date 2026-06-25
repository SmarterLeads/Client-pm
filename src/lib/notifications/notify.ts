import { revalidatePath } from "next/cache";
import {
  resolveMentionedTeamMemberIds,
  stripHtmlForMentions,
} from "@/lib/notifications/mentions";
import { safeCreateNotification } from "@/lib/notifications/create";
import { getProjectOwnerContext } from "@/lib/queries/projects";
import { pm } from "@/lib/supabase/pm";
import { createServiceClient } from "@/lib/supabase/service";
import type { NotificationType } from "@/lib/types";

function revalidateNotificationBell() {
  revalidatePath("/", "layout");
}

function uniqueIds(ids: Array<string | null | undefined>): string[] {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

function truncateCommentPreview(body: string, maxLength = 100): string {
  const plain = stripHtmlForMentions(body);
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).trim()}...`;
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

async function loadProjectMemberIds(projectId: string): Promise<string[]> {
  const service = createServiceClient();
  const { data, error } = await pm(service)
    .from("project_members")
    .select("team_member_id")
    .eq("project_id", projectId);

  if (error) {
    console.error("[loadProjectMemberIds]", error.message);
    return [];
  }

  return uniqueIds((data ?? []).map((row) => row.team_member_id));
}

async function loadPriorTaskCommentAuthorIds(taskId: string): Promise<string[]> {
  const service = createServiceClient();
  const { data, error } = await pm(service)
    .from("task_comments")
    .select("author_id")
    .eq("task_id", taskId)
    .not("author_id", "is", null);

  if (error) {
    console.error("[loadPriorTaskCommentAuthorIds]", error.message);
    return [];
  }

  return uniqueIds((data ?? []).map((row) => row.author_id));
}

async function notifyUniqueRecipients(params: {
  recipientIds: string[];
  actorId: string;
  type: NotificationType;
  entityType: string;
  entityId: string;
  title: string;
  body: string;
}): Promise<boolean> {
  const recipients = uniqueIds(params.recipientIds).filter(
    (recipientId) => recipientId !== params.actorId,
  );
  if (recipients.length === 0) return false;

  await Promise.all(
    recipients.map((recipientId) =>
      safeCreateNotification({
        recipientId,
        actorId: params.actorId,
        type: params.type,
        entityType: params.entityType,
        entityId: params.entityId,
        title: params.title,
        body: params.body,
      }),
    ),
  );

  return true;
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
  projectId: string;
  taskTitle: string;
  actorId: string;
  actorName: string;
  commentBody: string;
}) {
  const service = createServiceClient();

  const [{ data: task, error: taskError }, project, memberIds, priorAuthors, teamMembers] =
    await Promise.all([
      pm(service)
        .from("tasks")
        .select("assignee_id")
        .eq("id", params.taskId)
        .maybeSingle(),
      getProjectOwnerContext(params.projectId),
      loadProjectMemberIds(params.projectId),
      loadPriorTaskCommentAuthorIds(params.taskId),
      loadActiveTeamMembers(),
    ]);

  if (taskError) {
    console.error("[notifyTaskComment]", taskError.message);
  }

  const mentionedIds = resolveMentionedTeamMemberIds(
    params.commentBody,
    teamMembers,
  );

  const recipientIds = uniqueIds([
    task?.assignee_id,
    project?.ownerId,
    ...memberIds,
    ...priorAuthors,
    ...mentionedIds,
  ]);

  const preview = truncateCommentPreview(params.commentBody);
  const title = `New comment on: ${params.taskTitle}`;
  const body = `${params.actorName} commented on '${params.taskTitle}': ${preview}`;

  const sent = await notifyUniqueRecipients({
    recipientIds,
    actorId: params.actorId,
    type: "task_comment",
    entityType: "task",
    entityId: params.taskId,
    title,
    body,
  });

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
  const [project, memberIds] = await Promise.all([
    getProjectOwnerContext(params.projectId),
    loadProjectMemberIds(params.projectId),
  ]);

  if (!project) return;

  const title = `Task ready for review: ${params.taskTitle}`;
  const body = `${params.actorName} marked "${params.taskTitle}" as In Review in ${project.projectName}. Please review and mark as complete.`;

  const recipientIds = uniqueIds([
    project.ownerId,
    params.assigneeId,
    ...memberIds,
  ]);

  const sent = await notifyUniqueRecipients({
    recipientIds,
    actorId: params.actorId,
    type: "task_review",
    entityType: "task",
    entityId: params.taskId,
    title,
    body,
  });

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
