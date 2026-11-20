export type SendResendEmailParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

export type SendResendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string; skipped?: boolean };

function fromAddress(): string | null {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ??
    process.env.TASK_NOTIFICATION_FROM_EMAIL?.trim() ??
    null
  );
}

/** Sends transactional mail via Resend HTTP API (same key as inbound). */
export async function sendResendEmail(
  params: SendResendEmailParams,
): Promise<SendResendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = fromAddress();

  if (!apiKey) {
    console.warn("[sendResendEmail] RESEND_API_KEY not set — email skipped");
    return { ok: false, error: "RESEND_API_KEY not configured", skipped: true };
  }
  if (!from) {
    console.warn(
      "[sendResendEmail] RESEND_FROM_EMAIL not set — email skipped",
    );
    return {
      ok: false,
      error: "RESEND_FROM_EMAIL not configured",
      skipped: true,
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      text: params.text,
      html: params.html ?? undefined,
      reply_to: params.replyTo,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[sendResendEmail]", response.status, body);
    return {
      ok: false,
      error: `Resend API ${response.status}: ${body.slice(0, 200)}`,
    };
  }

  const json = (await response.json()) as { id?: string };
  return { ok: true, id: json.id ?? "unknown" };
}