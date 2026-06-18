import { pm } from "@/lib/supabase/pm";
import { createServiceClient } from "@/lib/supabase/service";
import type { NotificationType } from "@/lib/types";

export type CreateNotificationParams = {
  recipientId: string;
  type: NotificationType;
  entityType?: string | null;
  entityId?: string | null;
  title: string;
  body?: string | null;
  /** When set, skips notifying the actor themselves. */
  actorId?: string | null;
};

export async function createNotification(
  params: CreateNotificationParams,
): Promise<string> {
  const supabase = createServiceClient();

  const { data, error } = await pm(supabase)
    .from("notifications")
    .insert({
      recipient_id: params.recipientId,
      type: params.type,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      title: params.title,
      body: params.body ?? null,
      read: false,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create notification: ${error.message}`);
  }

  if (!data) {
    throw new Error("Failed to create notification: no id returned.");
  }

  return data.id;
}

/** Inserts a notification without failing the caller's main action. */
export async function safeCreateNotification(
  params: CreateNotificationParams,
): Promise<void> {
  if (!params.recipientId) return;
  if (params.actorId && params.actorId === params.recipientId) return;

  try {
    await createNotification(params);
  } catch (err) {
    console.error(
      "[safeCreateNotification]",
      err instanceof Error ? err.message : err,
    );
  }
}
