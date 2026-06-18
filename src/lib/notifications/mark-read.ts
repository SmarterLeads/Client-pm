import { pm } from "@/lib/supabase/pm";
import { createServiceClient } from "@/lib/supabase/service";

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
