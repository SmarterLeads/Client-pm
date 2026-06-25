import {
  extractEmailsFromForwardedBody,
  htmlToPlainText,
  isForwardedSubject,
} from "@/lib/email/parse-forwarded";
import { extractEmailAddresses, normalizeEmail } from "@/lib/email/parse-address";
import {
  resolveInboundEmailContent,
  type ResendInboundWebhookEvent,
} from "@/lib/email/resend-inbound";
import { safeCreateNotification } from "@/lib/notifications/create";
import { pm } from "@/lib/supabase/pm";
import { createServiceClient } from "@/lib/supabase/service";

type TeamMemberEmailRow = {
  team_member_id: string;
  email: string;
};

type ClientContactMatch = {
  client_id: string;
  email: string;
};

async function lookupTeamMemberByEmails(
  emails: string[],
): Promise<string | null> {
  if (emails.length === 0) return null;

  const service = createServiceClient();
  const { data, error } = await pm(service)
    .from("team_member_emails")
    .select("team_member_id, email")
    .in(
      "email",
      emails.map((email) => normalizeEmail(email)),
    )
    .limit(1);

  if (error) {
    console.error("[lookupTeamMemberByEmails]", error.message);
    return null;
  }

  return (data as TeamMemberEmailRow[] | null)?.[0]?.team_member_id ?? null;
}

async function lookupClientByContactEmail(
  email: string,
): Promise<ClientContactMatch | null> {
  const normalized = normalizeEmail(email);
  if (!normalized.includes("@")) return null;

  const service = createServiceClient();
  const { data, error } = await service
    .from("client_contacts")
    .select("client_id, email")
    .eq("email", normalized)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[lookupClientByContactEmail]", error.message);
    return null;
  }

  if (!data?.client_id) return null;

  return {
    client_id: data.client_id,
    email: data.email,
  };
}

async function lookupClientByContactEmails(
  emails: string[],
): Promise<ClientContactMatch | null> {
  const seen = new Set<string>();

  for (const email of emails) {
    const normalized = normalizeEmail(email);
    if (!normalized.includes("@") || seen.has(normalized)) continue;
    seen.add(normalized);

    const match = await lookupClientByContactEmail(normalized);
    if (match) return match;
  }

  return null;
}

function resolvePlainTextBody(content: {
  text: string | null;
  html: string | null;
}): string | null {
  if (content.text?.trim()) return content.text.trim();
  return htmlToPlainText(content.html);
}

async function resolveClientMatch(params: {
  toEmails: string[];
  ccEmails: string[];
  bccEmails: string[];
  subject: string | null;
  bodyText: string | null;
}): Promise<ClientContactMatch | null> {
  const headerEmails = [
    ...params.toEmails,
    ...params.ccEmails,
    ...params.bccEmails,
  ];

  const headerMatch = await lookupClientByContactEmails(headerEmails);
  if (headerMatch) {
    console.log("[processInboundEmailEvent] matched client via headers", {
      email: headerMatch.email,
      clientId: headerMatch.client_id,
    });
    return headerMatch;
  }

  const forwardedSubject = isForwardedSubject(params.subject);
  const bodyEmails = extractEmailsFromForwardedBody(params.bodyText);

  if (bodyEmails.length > 0) {
    const bodyMatch = await lookupClientByContactEmails(bodyEmails);
    if (bodyMatch) {
      console.log("[processInboundEmailEvent] matched client via forwarded body", {
        email: bodyMatch.email,
        clientId: bodyMatch.client_id,
        forwardedSubject,
      });
      return bodyMatch;
    }
  }

  if (forwardedSubject) {
    console.log(
      "[processInboundEmailEvent] forwarded subject but no client match",
      {
        subject: params.subject,
        bodyEmailCount: bodyEmails.length,
      },
    );
  }

  return null;
}

async function createInteractionFromEmail(params: {
  clientId: string;
  teamMemberId: string | null;
  subject: string | null;
  bodyText: string | null;
  occurredAt: string;
}) {
  const service = createServiceClient();

  const { data, error } = await pm(service)
    .from("interactions")
    .insert({
      client_id: params.clientId,
      type: "check_in",
      logged_by: params.teamMemberId,
      summary: params.subject?.trim() || "Inbound email",
      body: params.bodyText,
      occurred_at: params.occurredAt,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.id) {
    throw new Error("Failed to create interaction from inbound email.");
  }

  return data.id;
}

export async function processInboundEmailEvent(
  event: ResendInboundWebhookEvent,
) {
  if (event.type !== "email.received" || !event.data) {
    return;
  }

  const fromEmail = normalizeEmail(event.data.from ?? "");
  const toEmails = extractEmailAddresses(event.data.to);
  const ccEmails = extractEmailAddresses(event.data.cc);
  const bccEmails = extractEmailAddresses(event.data.bcc);
  const subject = event.data.subject ?? null;
  const receivedAt = event.data.created_at ?? new Date().toISOString();

  const content = await resolveInboundEmailContent(event.data);
  const bodyText = resolvePlainTextBody(content);

  console.log("[processInboundEmailEvent] resolved content", {
    emailId: event.data.email_id,
    hasBodyText: Boolean(bodyText?.trim()),
    hasHtml: Boolean(content.html?.trim()),
  });

  const teamMemberId = fromEmail
    ? await lookupTeamMemberByEmails([fromEmail])
    : null;
  const recipientTeamMemberId = await lookupTeamMemberByEmails([
    ...toEmails,
    ...ccEmails,
    ...bccEmails,
  ]);

  const clientMatch = await resolveClientMatch({
    toEmails,
    ccEmails,
    bccEmails,
    subject,
    bodyText,
  });

  const service = createServiceClient();

  if (clientMatch) {
    const interactionId = await createInteractionFromEmail({
      clientId: clientMatch.client_id,
      teamMemberId,
      subject,
      bodyText,
      occurredAt: receivedAt,
    });

    const { error } = await pm(service).from("email_log").insert({
      from_email: fromEmail || event.data.from || "unknown",
      to_email: toEmails.join(", ") || null,
      cc_email: ccEmails.join(", ") || null,
      subject,
      body_text: bodyText,
      body_html: content.html,
      received_at: receivedAt,
      team_member_id: teamMemberId,
      matched_client_id: clientMatch.client_id,
      interaction_id: interactionId,
      status: "matched",
    });

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { data: emailLog, error } = await pm(service)
    .from("email_log")
    .insert({
      from_email: fromEmail || event.data.from || "unknown",
      to_email: toEmails.join(", ") || null,
      cc_email: ccEmails.join(", ") || null,
      subject,
      body_text: bodyText,
      body_html: content.html,
      received_at: receivedAt,
      team_member_id: teamMemberId,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const notifyRecipientId = recipientTeamMemberId ?? teamMemberId;
  if (notifyRecipientId) {
    const subjectLabel = subject?.trim() || "No subject";
    await safeCreateNotification({
      recipientId: notifyRecipientId,
      type: "comment_mention",
      entityType: "email_log",
      entityId: emailLog?.id ?? null,
      title: `Unmatched email: ${subjectLabel} - assign to a client`,
    });
  }
}
