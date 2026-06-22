"use server";

import { revalidatePath } from "next/cache";
import { getTeamMember } from "@/lib/auth/session";
import { insertInteractionWithTeamMemberContext } from "@/lib/supabase/with-team-member-context";
import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";

export type AssignEmailFormState = {
  success?: boolean;
  error?: string;
};

export async function assignEmailToClient(
  _prevState: AssignEmailFormState,
  formData: FormData,
): Promise<AssignEmailFormState> {
  const teamMember = await getTeamMember();
  if (!teamMember) {
    return { error: "You must be signed in." };
  }

  const emailLogId = String(formData.get("email_log_id") ?? "").trim();
  const clientId = String(formData.get("client_id") ?? "").trim();

  if (!emailLogId || !clientId) {
    return { error: "Email and client are required." };
  }

  const supabase = await createClient();
  const { data: emailLog, error: fetchError } = await pm(supabase)
    .from("email_log")
    .select("*")
    .eq("id", emailLogId)
    .eq("status", "pending")
    .maybeSingle();

  if (fetchError || !emailLog) {
    return { error: "Pending email not found." };
  }

  try {
    const interactionId = await insertInteractionWithTeamMemberContext(
      teamMember.id,
      {
        client_id: clientId,
        type: "check_in",
        summary: emailLog.subject?.trim() || "Inbound email",
        body: emailLog.body_text,
        occurred_at: emailLog.received_at,
      },
    );

    const { error: updateError } = await pm(supabase)
      .from("email_log")
      .update({
        status: "matched",
        matched_client_id: clientId,
        interaction_id: interactionId,
        team_member_id: emailLog.team_member_id ?? teamMember.id,
      })
      .eq("id", emailLogId)
      .eq("status", "pending");

    if (updateError) {
      return { error: updateError.message };
    }

    revalidatePath("/dashboard");
    revalidatePath("/", "layout");
    revalidatePath(`/clients/${clientId}`);

    return { success: true };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to assign email to client.",
    };
  }
}
