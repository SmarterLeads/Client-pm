import type { NextApiRequest, NextApiResponse } from "next";
import { processInboundEmailEvent } from "@/lib/email/inbound-processor";
import { verifyResendWebhook } from "@/lib/email/resend-inbound";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let rawBody: string;
  try {
    rawBody = await readRawBody(req);
  } catch (err) {
    console.error("[email-inbound] failed to read body", err);
    return res.status(200).json({ ok: true });
  }

  console.log(
    "[email-inbound] RESEND_WEBHOOK_SECRET set:",
    !!process.env.RESEND_WEBHOOK_SECRET,
  );
  console.log(
    "[email-inbound] RESEND_API_KEY set:",
    !!process.env.RESEND_API_KEY,
  );
  console.log(
    "[email-inbound] headers:",
    JSON.stringify({
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    }),
  );

  let event;
  try {
    event = verifyResendWebhook(rawBody, {
      svixId: req.headers["svix-id"],
      svixTimestamp: req.headers["svix-timestamp"],
      svixSignature: req.headers["svix-signature"],
      sharedSecret: req.headers["x-webhook-secret"],
    });
  } catch (err) {
    console.error(
      "[email-inbound] verification failed",
      err instanceof Error ? err.message : err,
    );
    return res.status(401).json({ error: "Unauthorized" });
  }

  console.log("[email-inbound] payload:", JSON.stringify(event.data));
  console.log("[email] email_id:", event.data?.email_id);
  console.log("[email] RESEND_API_KEY set:", !!process.env.RESEND_API_KEY);

  try {
    await processInboundEmailEvent(event);
  } catch (err) {
    console.error(
      "[email-inbound] processing failed",
      err instanceof Error ? err.message : err,
    );
  }

  return res.status(200).json({ ok: true });
}
