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

  console.log("[email] extracted content fields:", {
    hasText: Boolean(text?.trim()),
    hasHtml: Boolean(html?.trim()),
    keys: Object.keys(payload),
  });

  return { text, html };
}

export function resolveInboundEmailId(
  data: NonNullable<ResendInboundWebhookEvent["data"]>,
): string | null {
  const emailId = data.email_id?.trim();
  if (emailId) return emailId;

  const legacyId = (data as { id?: string }).id?.trim();
  if (legacyId) {
    console.warn("[email] using data.id fallback for email_id:", legacyId);
    return legacyId;
  }

  return null;
}

async function fetchEmailContentFromUrl(
  url: string,
  apiKey: string,
): Promise<
  | { ok: true; content: ReceivedEmailContent; raw: ResendEmailPayload }
  | { ok: false; status: number; errorBody: string }
> {
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
  console.log("[email] body response:", JSON.stringify(json));

  return { ok: true, content: extractEmailContent(json), raw: json };
}

export async function fetchReceivedEmailContent(
  emailId: string,
): Promise<ReceivedEmailContent> {
  console.log("[email] email_id:", emailId);
  console.log("[email] RESEND_API_KEY set:", !!process.env.RESEND_API_KEY);

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — cannot fetch email body");
    return { text: null, html: null };
  }

  const urls = [
    `https://api.resend.com/emails/receiving/${emailId}`,
    `https://api.resend.com/emails/${emailId}`,
  ];

  let lastSuccessfulContent: ReceivedEmailContent | null = null;
  let lastError: { status: number; errorBody: string; url: string } | null =
    null;

  for (let attempt = 0; attempt < 3; attempt++) {
    for (const url of urls) {
      console.log("[email] fetching body from:", url, `(attempt ${attempt + 1})`);

      const result = await fetchEmailContentFromUrl(url, apiKey);

      if (result.ok) {
        lastSuccessfulContent = result.content;
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

        console.log("[email] body fetch returned empty text/html", {
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

  return lastSuccessfulContent ?? { text: null, html: null };
}

export async function resolveInboundEmailContent(
  data: NonNullable<ResendInboundWebhookEvent["data"]>,
): Promise<ReceivedEmailContent> {
  const emailId = resolveInboundEmailId(data);

  console.log("[email] resolveInboundEmailContent email_id:", emailId);
  console.log("[email] RESEND_API_KEY set:", !!process.env.RESEND_API_KEY);

  if (emailId) {
    const fetched = await fetchReceivedEmailContent(emailId);
    if (fetched.text?.trim() || fetched.html?.trim()) {
      return fetched;
    }
  } else {
    console.warn("[email] no email_id on webhook payload — cannot fetch body");
  }

  return {
    text: data.text ?? null,
    html: data.html ?? null,
  };
}
