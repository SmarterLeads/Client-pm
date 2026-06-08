import { pm } from "@/lib/supabase/pm";
import { createServiceClient } from "@/lib/supabase/service";
import type { NotificationType } from "@/lib/types";

export async function createNotification(
  recipientId: string,
  type: NotificationType,
  entityType: string | null,
  entityId: string | null,
  title: string,
  body: string | null,
): Promise<string> {
  const supabase = createServiceClient();

  const { data, error } = await pm(supabase)
    .from("notifications")
    .insert({
      recipient_id: recipientId,
      type,
      entity_type: entityType,
      entity_id: entityId,
      title,
      body,
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

export async function markAsRead(notificationId: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await pm(supabase)
    .from("notifications")
    .update({
      read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId);

  if (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }
}

export async function markAllAsRead(recipientId: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await pm(supabase)
    .from("notifications")
    .update({
      read: true,
      read_at: new Date().toISOString(),
    })
    .eq("recipient_id", recipientId)
    .eq("read", false);

  if (error) {
    throw new Error(`Failed to mark all notifications as read: ${error.message}`);
  }
}
