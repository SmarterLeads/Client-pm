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

type ResendEmailPayload = {
  text?: string | null;
  html?: string | null;
  body?: string | null;
  data?: {
    text?: string | null;
    html?: string | null;
    body?: string | null;
  };
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

function extractEmailContent(json: ResendEmailPayload): ReceivedEmailContent {
  const payload = json.data ?? json;
  const text = payload.text ?? payload.body ?? null;
  const html = payload.html ?? null;
  return { text, html };
}

async function fetchEmailContentFromUrl(
  url: string,
  apiKey: string,
): Promise<{ ok: true; content: ReceivedEmailContent } | { ok: false; status: number; errorBody: string }> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      errorBody: await response.text(),
    };
  }

  const json = (await response.json()) as ResendEmailPayload;
  return { ok: true, content: extractEmailContent(json) };
}

export async function fetchReceivedEmailContent(
  emailId: string,
): Promise<ReceivedEmailContent> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — cannot fetch email body");
    return { text: null, html: null };
  }

  console.log("[email] fetching body for email_id:", emailId);

  const urls = [
    `https://api.resend.com/emails/receiving/${emailId}`,
    `https://api.resend.com/emails/${emailId}`,
  ];

  let lastError: { status: number; errorBody: string; url: string } | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    for (const url of urls) {
      const result = await fetchEmailContentFromUrl(url, apiKey);

      if (result.ok) {
        const { text, html } = result.content;
        console.log("[email] body fetch result:", {
          emailId,
          url,
          attempt: attempt + 1,
          hasText: Boolean(text?.trim()),
          hasHtml: Boolean(html?.trim()),
        });

        if (text?.trim() || html?.trim()) {
          return result.content;
        }

        console.log("[email] body fetch returned empty content", {
          emailId,
          url,
          attempt: attempt + 1,
        });
        continue;
      }

      lastError = {
        status: result.status,
        errorBody: result.errorBody,
        url,
      };

      console.error("[email] body fetch failed:", {
        emailId,
        url,
        attempt: attempt + 1,
        status: result.status,
        error: result.errorBody,
      });

      if (result.status !== 404) {
        break;
      }
    }

    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
    }
  }

  if (lastError) {
    console.error("[email] body fetch exhausted retries:", {
      emailId,
      ...lastError,
    });
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
