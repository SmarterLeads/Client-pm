"use server";

import { revalidatePath } from "next/cache";
import { getTeamMember } from "@/lib/auth/session";
import {
  markAllAsRead,
  markAsRead,
} from "@/lib/notifications";
import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";

async function requireRecipientOwnsNotification(notificationId: string) {
  const teamMember = await getTeamMember();
  if (!teamMember) {
    throw new Error("You must be signed in.");
  }

  const supabase = await createClient();
  const { data, error } = await pm(supabase)
    .from("notifications")
    .select("recipient_id")
    .eq("id", notificationId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Notification not found.");
  }

  if (data.recipient_id !== teamMember.id) {
    throw new Error("You cannot modify this notification.");
  }

  return teamMember;
}

function revalidateAppLayout() {
  revalidatePath("/", "layout");
}

export async function markNotificationAsRead(
  notificationId: string,
): Promise<{ error?: string }> {
  try {
    await requireRecipientOwnsNotification(notificationId);
    await markAsRead(notificationId);
    revalidateAppLayout();
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to mark notification read.",
    };
  }
}

export async function markAllNotificationsAsRead(): Promise<{ error?: string }> {
  try {
    const teamMember = await getTeamMember();
    if (!teamMember) {
      return { error: "You must be signed in." };
    }

    await markAllAsRead(teamMember.id);
    revalidateAppLayout();
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Failed to mark all notifications read.",
    };
  }
}
