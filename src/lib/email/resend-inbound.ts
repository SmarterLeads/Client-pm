import { Webhook } from "svix";

export type ResendInboundWebhookEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    created_at?: string;
    from?: string;
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
  };
};

export type ReceivedEmailContent = {
  text: string | null;
  html: string | null;
};

export function verifyResendWebhook(
  rawBody: string,
  headers: {
    svixId?: string | string[];
    svixTimestamp?: string | string[];
    svixSignature?: string | string[];
    sharedSecret?: string | string[];
  },
): ResendInboundWebhookEvent {
  const headerSecret =
    typeof headers.sharedSecret === "string"
      ? headers.sharedSecret
      : headers.sharedSecret?.[0];

  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const inboundSecret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;

  if (headerSecret && inboundSecret && headerSecret === inboundSecret) {
    return JSON.parse(rawBody) as ResendInboundWebhookEvent;
  }

  if (!webhookSecret) {
    throw new Error("Missing RESEND_WEBHOOK_SECRET");
  }

  const svixId =
    typeof headers.svixId === "string" ? headers.svixId : headers.svixId?.[0];
  const svixTimestamp =
    typeof headers.svixTimestamp === "string"
      ? headers.svixTimestamp
      : headers.svixTimestamp?.[0];
  const svixSignature =
    typeof headers.svixSignature === "string"
      ? headers.svixSignature
      : headers.svixSignature?.[0];

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new Error("Missing Svix webhook headers");
  }

  const wh = new Webhook(webhookSecret);
  return wh.verify(rawBody, {
    "svix-id": svixId,
    "svix-timestamp": svixTimestamp,
    "svix-signature": svixSignature,
  }) as ResendInboundWebhookEvent;
}

export async function fetchReceivedEmailContent(
  emailId: string,
): Promise<ReceivedEmailContent> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { text: null, html: null };
  }

  const response = await fetch(
    `https://api.resend.com/emails/receiving/${emailId}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );

  if (!response.ok) {
    console.error(
      "[fetchReceivedEmailContent]",
      emailId,
      response.status,
      await response.text(),
    );
    return { text: null, html: null };
  }

  const data = (await response.json()) as {
    text?: string | null;
    html?: string | null;
  };

  return {
    text: data.text ?? null,
    html: data.html ?? null,
  };
}
