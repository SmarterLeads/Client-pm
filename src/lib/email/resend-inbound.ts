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

function readHeader(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === "string") return value;
  return value?.[0];
}

export function verifyResendWebhook(
  rawBody: string,
  headers: {
    svixId?: string | string[];
    svixTimestamp?: string | string[];
    svixSignature?: string | string[];
    sharedSecret?: string | string[];
  },
): ResendInboundWebhookEvent {
  const headerSecret = readHeader(headers.sharedSecret);
  const inboundSecret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET?.trim();

  if (headerSecret && inboundSecret && headerSecret === inboundSecret) {
    return JSON.parse(rawBody) as ResendInboundWebhookEvent;
  }

  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    console.warn(
      "[email-inbound] RESEND_WEBHOOK_SECRET not set — skipping Svix verification (testing only)",
    );
    return JSON.parse(rawBody) as ResendInboundWebhookEvent;
  }

  const svixId = readHeader(headers.svixId);
  const svixTimestamp = readHeader(headers.svixTimestamp);
  const svixSignature = readHeader(headers.svixSignature);

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new Error("Missing Svix webhook headers (svix-id, svix-timestamp, svix-signature)");
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
