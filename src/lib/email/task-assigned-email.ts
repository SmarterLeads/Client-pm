import { getAppBaseUrl } from "@/lib/email/app-url";
import { sendResendEmail } from "@/lib/email/send-resend";
import { pm } from "@/lib/supabase/pm";
import { createServiceClient } from "@/lib/supabase/service";

export type TaskAssignedEmailParams = {
  assigneeId: string;
  actorId: string;
  actorName: string;
  taskId: string;
  taskTitle: string;
  projectId: string;
  dueDate?: string | null;
  priority?: string | null;
};

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function safeSendTaskAssignedEmail(
  params: TaskAssignedEmailParams,
): Promise<void> {
  if (params.assigneeId === params.actorId) return;

  try {
    const service = createServiceClient();
    const [{ data: assignee, error: assigneeError }, { data: project }] =
      await Promise.all([
        pm(service)
          .from("team_members")
          .select("email, name, is_active")
          .eq("id", params.assigneeId)
          .maybeSingle(),
        pm(service)
          .from("projects")
          .select("name")
          .eq("id", params.projectId)
          .maybeSingle(),
      ]);

    if (assigneeError || !assignee?.email?.trim()) {
      console.warn("[safeSendTaskAssignedEmail] no assignee email");
      return;
    }
    if (assignee.is_active === false) return;

    const projectName = project?.name?.trim() || "a project";
    const taskUrl = `${getAppBaseUrl()}/projects/${params.projectId}`;
    const subject = `New task assigned: ${params.taskTitle}`;
    const dueLine = params.dueDate
      ? `Due: ${params.dueDate}\n`
      : "";
    const priorityLine = params.priority
      ? `Priority: ${params.priority}\n`
      : "";

    const text = [
      `Hi ${assignee.name},`,
      "",
      `${params.actorName} assigned you a new task in ${projectName}:`,
      "",
      `Task: ${params.taskTitle}`,
      priorityLine,
      dueLine,
      `Open project: ${taskUrl}`,
      "",
      "— SmarterLeads PM",
    ]
      .filter(Boolean)
      .join("\n");

    const html = `
      <p>Hi ${escapeHtml(assignee.name)},</p>
      <p><strong>${escapeHtml(params.actorName)}</strong> assigned you a new task in <strong>${escapeHtml(projectName)}</strong>:</p>
      <p><strong>${escapeHtml(params.taskTitle)}</strong></p>
      ${params.priority ? `<p>Priority: ${escapeHtml(params.priority)}</p>` : ""}
      ${params.dueDate ? `<p>Due: ${escapeHtml(params.dueDate)}</p>` : ""}
      <p><a href="${escapeHtml(taskUrl)}">Open project in PM</a></p>
      <p style="color:#666;font-size:12px;">SmarterLeads PM</p>
    `.trim();

    const result = await sendResendEmail({
      to: assignee.email.trim(),
      subject,
      text,
      html,
    });

    if (!result.ok && !result.skipped) {
      console.error("[safeSendTaskAssignedEmail]", result.error);
    }
  } catch (err) {
    console.error(
      "[safeSendTaskAssignedEmail]",
      err instanceof Error ? err.message : err,
    );
  }
}