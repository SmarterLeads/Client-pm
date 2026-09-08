"use server";

import { revalidatePath } from "next/cache";
import { getTeamMember } from "@/lib/auth/session";
import { pm } from "@/lib/supabase/pm";
import { createServiceClient } from "@/lib/supabase/service";

export type TaskViewPreference = "list" | "board";

export async function updateTaskViewPreference(
  preference: TaskViewPreference,
): Promise<{ error?: string }> {
  try {
    const teamMember = await getTeamMember();
    if (!teamMember) {
      return { error: "You must be signed in." };
    }

    if (preference !== "list" && preference !== "board") {
      return { error: "Invalid view preference." };
    }

    const supabase = createServiceClient();
    const { error } = await pm(supabase)
      .from("team_members")
      .update({ task_view_preference: preference })
      .eq("id", teamMember.id);

    if (error) return { error: error.message };

    revalidatePath("/projects", "layout");
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to save view preference.",
    };
  }
}
