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
    /** Not included on webhooks — fetch via Receiving API. Optional fallback. */
    text?: string | null;
    html?: string | null;
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
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[fetchReceivedEmailContent] RESEND_API_KEY not set");
    return { text: null, html: null };
  }

  const url = `https://api.resend.com/emails/receiving/${emailId}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      const json = (await response.json()) as {
        text?: string | null;
        html?: string | null;
        data?: {
          text?: string | null;
          html?: string | null;
        };
      };

      const payload = json.data ?? json;
      const text = payload.text ?? null;
      const html = payload.html ?? null;

      console.log("[fetchReceivedEmailContent]", emailId, {
        attempt: attempt + 1,
        hasText: Boolean(text?.trim()),
        hasHtml: Boolean(html?.trim()),
      });

      return { text, html };
    }

    const errorBody = await response.text();

    if (response.status === 404 && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      continue;
    }

    console.error(
      "[fetchReceivedEmailContent]",
      emailId,
      response.status,
      errorBody,
    );
    return { text: null, html: null };
  }

  return { text: null, html: null };
}

export async function resolveInboundEmailContent(
  data: NonNullable<ResendInboundWebhookEvent["data"]>,
): Promise<ReceivedEmailContent> {
  if (data.email_id) {
    const fetched = await fetchReceivedEmailContent(data.email_id);
    if (fetched.text?.trim() || fetched.html?.trim()) {
      return fetched;
    }
  }

  return {
    text: data.text ?? null,
    html: data.html ?? null,
  };
}
