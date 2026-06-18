"use server";

import { revalidatePath } from "next/cache";
import { getClientUser, getTeamMember } from "@/lib/auth/session";
import { safeCreateNotification } from "@/lib/notifications/create";
import { pm } from "@/lib/supabase/pm";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { invitePortalUserSchema } from "@/lib/validations/portal";
import type { z } from "zod";

export type PortalFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  tempPassword?: string;
};

function zodFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = [];
    out[key].push(issue.message);
  }
  return out;
}

function generateTempPassword(length = 12): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
}

async function requireTeamMember() {
  const teamMember = await getTeamMember();
  if (!teamMember) {
    throw new Error("You must be signed in as a team member.");
  }
  return teamMember;
}

async function requirePortalApprover() {
  const clientUser = await getClientUser();
  if (!clientUser) {
    throw new Error("You must be signed in to the client portal.");
  }
  if (clientUser.access_level !== "approver") {
    throw new Error("Only approvers can perform this action.");
  }
  return clientUser;
}

export async function approveMilestone(
  projectId: string,
  milestoneId: string,
): Promise<{ error?: string }> {
  try {
    const clientUser = await requirePortalApprover();
    const supabase = await createClient();

    const { data: milestone, error: fetchError } = await pm(supabase)
      .from("milestones")
      .select(
        `
        id,
        title,
        approved_by_client,
        completed,
        project:projects(id, name, owner_id)
      `,
      )
      .eq("id", milestoneId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (fetchError) {
      return { error: fetchError.message };
    }

    if (!milestone) {
      return { error: "Milestone not found." };
    }

    if (milestone.approved_by_client) {
      return { error: "This milestone is already approved." };
    }

    const { error: updateError } = await pm(supabase)
      .from("milestones")
      .update({ approved_by_client: true })
      .eq("id", milestoneId);

    if (updateError) {
      return { error: updateError.message };
    }

    const ownerId = milestone.project?.owner_id;
    if (ownerId) {
      await safeCreateNotification({
        recipientId: ownerId,
        type: "milestone_approved",
        entityType: "milestone",
        entityId: milestoneId,
        title: `Milestone approved: ${milestone.title}`,
        body: `${clientUser.name ?? "A client contact"} approved "${milestone.title}" on ${milestone.project?.name ?? "a project"}.`,
      });
    }

    revalidatePath(`/portal/projects/${projectId}`);
    revalidatePath("/portal/dashboard");
    revalidatePath("/portal/projects");
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to approve milestone.",
    };
  }
}

export async function invitePortalUser(
  clientId: string,
  _prevState: PortalFormState,
  formData: FormData,
): Promise<PortalFormState> {
  try {
    await requireTeamMember();

    const parsed = invitePortalUserSchema.safeParse({
      email: formData.get("email"),
      name: formData.get("name"),
      access_level: formData.get("access_level"),
    });

    if (!parsed.success) {
      return { fieldErrors: zodFieldErrors(parsed.error) };
    }

    const { email, name, access_level } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const supabase = createServiceClient();

    const { data: existing, error: existingError } = await pm(supabase)
      .from("client_portal_users")
      .select("id, is_active, auth_user_id")
      .eq("client_id", clientId)
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (existingError) {
      return { error: existingError.message };
    }

    if (existing?.is_active) {
      return { error: "This email already has active portal access." };
    }

    const { data: contact, error: contactError } = await supabase
      .from("client_contacts")
      .select("id")
      .eq("client_id", clientId)
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (contactError) {
      return { error: contactError.message };
    }

    const userPayload = {
      client_id: clientId,
      email: normalizedEmail,
      name: name ?? null,
      access_level,
      contact_id: contact?.id ?? null,
      is_active: true,
      invited_at: new Date().toISOString(),
    };

    let clientUserId: string;

    if (existing) {
      const { error: updateError } = await pm(supabase)
        .from("client_portal_users")
        .update(userPayload)
        .eq("id", existing.id);

      if (updateError) {
        return { error: updateError.message };
      }
      clientUserId = existing.id;
    } else {
      const { data: inserted, error: insertError } = await pm(supabase)
        .from("client_portal_users")
        .insert(userPayload)
        .select("id")
        .single();

      if (insertError) {
        return { error: insertError.message };
      }
      clientUserId = inserted.id;
    }

    const tempPassword = generateTempPassword(12);
    const userMetadata = { client_id: clientId, access_level };

    let authUserId: string;

    if (existing?.auth_user_id) {
      const { data: updatedAuth, error: updateAuthError } =
        await supabase.auth.admin.updateUserById(existing.auth_user_id, {
          password: tempPassword,
          email_confirm: true,
          user_metadata: userMetadata,
        });

      if (updateAuthError) {
        return { error: updateAuthError.message };
      }

      authUserId = updatedAuth.user.id;
    } else {
      const { data: createdAuth, error: createAuthError } =
        await supabase.auth.admin.createUser({
          email: normalizedEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: userMetadata,
        });

      if (createAuthError) {
        return { error: createAuthError.message };
      }

      authUserId = createdAuth.user.id;

      const { error: linkError } = await pm(supabase)
        .from("client_portal_users")
        .update({ auth_user_id: authUserId })
        .eq("id", clientUserId);

      if (linkError) {
        return { error: linkError.message };
      }
    }

    revalidatePath(`/clients/${clientId}`);
    return { success: true, tempPassword };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to invite portal user.",
    };
  }
}

export async function revokePortalUser(
  clientId: string,
  clientUserId: string,
): Promise<{ error?: string }> {
  try {
    await requireTeamMember();
    const supabase = createServiceClient();

    const { error } = await pm(supabase)
      .from("client_portal_users")
      .update({ is_active: false })
      .eq("id", clientUserId)
      .eq("client_id", clientId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath(`/clients/${clientId}`);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to revoke access.",
    };
  }
}
