import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/lib/types";

export async function getNotificationsForRecipient(
  recipientId: string,
  limit = 50,
): Promise<Notification[]> {
  if (!recipientId) {
    return [];
  }

  try {
    const supabase = await createClient();

    const { data, error } = await pm(supabase)
      .from("notifications")
      .select("*")
      .eq("recipient_id", recipientId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("getNotificationsForRecipient:", error.message);
      return [];
    }

    return (data ?? []).filter(
      (row): row is Notification =>
        Boolean(row?.id && row?.title && row?.type && row?.created_at),
    );
  } catch (err) {
    console.error(
      "getNotificationsForRecipient:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}
