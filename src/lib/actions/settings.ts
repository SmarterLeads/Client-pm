"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/roles";
import { getSessionUser, getTeamMember } from "@/lib/auth/session";
import { pm } from "@/lib/supabase/pm";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import {
  changePasswordSchema,
  inviteTeamMemberSchema,
  updateAccountProfileSchema,
  updateTeamMemberRoleSchema,
} from "@/lib/validations/settings";
import type { z } from "zod";

export type SettingsFormState = {
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

async function requireAdmin() {
  const teamMember = await requireTeamMember();
  if (!isAdmin(teamMember.role)) {
    throw new Error("Only admins can perform this action.");
  }
  return teamMember;
}

function revalidateSettingsPaths() {
  revalidatePath("/settings/team");
  revalidatePath("/settings/account");
  revalidatePath("/team");
  revalidatePath("/", "layout");
}

export async function inviteTeamMember(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  try {
    await requireAdmin();

    const parsed = inviteTeamMemberSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      role: formData.get("role"),
      agency_id: formData.get("agency_id"),
    });

    if (!parsed.success) {
      return { fieldErrors: zodFieldErrors(parsed.error) };
    }

    const { name, email, role, agency_id } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const supabase = createServiceClient();

    const { data: existing, error: existingError } = await pm(supabase)
      .from("team_members")
      .select("id, is_active, auth_user_id")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (existingError) {
      return { error: existingError.message };
    }

    if (existing?.is_active) {
      return { error: "A team member with this email already exists." };
    }

    const tempPassword = generateTempPassword(12);
    let authUserId: string;

    if (existing?.auth_user_id) {
      const { data: updatedAuth, error: updateAuthError } =
        await supabase.auth.admin.updateUserById(existing.auth_user_id, {
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: name },
        });

      if (updateAuthError) {
        return { error: updateAuthError.message };
      }

      authUserId = updatedAuth.user.id;

      const { error: updateMemberError } = await pm(supabase)
        .from("team_members")
        .update({
          name,
          email: normalizedEmail,
          role,
          agency_id: agency_id ?? null,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateMemberError) {
        return { error: updateMemberError.message };
      }
    } else {
      const { data: createdAuth, error: createAuthError } =
        await supabase.auth.admin.createUser({
          email: normalizedEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: name },
        });

      if (createAuthError) {
        return { error: createAuthError.message };
      }

      authUserId = createdAuth.user.id;

      if (existing) {
        const { error: updateMemberError } = await pm(supabase)
          .from("team_members")
          .update({
            auth_user_id: authUserId,
            name,
            email: normalizedEmail,
            role,
            agency_id: agency_id ?? null,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (updateMemberError) {
          return { error: updateMemberError.message };
        }
      } else {
        const { error: insertMemberError } = await pm(supabase)
          .from("team_members")
          .insert({
            auth_user_id: authUserId,
            name,
            email: normalizedEmail,
            role,
            agency_id: agency_id ?? null,
            is_active: true,
          });

        if (insertMemberError) {
          return { error: insertMemberError.message };
        }
      }
    }

    if (agency_id) {
      const { error: agencyError } = await supabase.from("user_agencies").upsert(
        {
          user_id: authUserId,
          agency_id,
          role: role === "admin" ? "admin" : "member",
        },
        { onConflict: "user_id,agency_id" },
      );

      if (agencyError) {
        return { error: agencyError.message };
      }
    }

    revalidateSettingsPaths();
    return { success: true, tempPassword };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to invite team member.",
    };
  }
}

export async function setTeamMemberActive(
  memberId: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const { error } = await pm(supabase)
      .from("team_members")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId);

    if (error) {
      return { error: error.message };
    }

    revalidateSettingsPaths();
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to update team member.",
    };
  }
}

export async function updateTeamMemberRole(
  memberId: string,
  role: string,
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const parsed = updateTeamMemberRoleSchema.safeParse({ role });

    if (!parsed.success) {
      return { error: "Invalid role." };
    }

    const supabase = createServiceClient();
    const { error } = await pm(supabase)
      .from("team_members")
      .update({
        role: parsed.data.role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId);

    if (error) {
      return { error: error.message };
    }

    revalidateSettingsPaths();
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update role.",
    };
  }
}

export async function updateAccountProfile(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = updateAccountProfileSchema.safeParse({
      name: formData.get("name"),
      avatar_url: formData.get("avatar_url"),
    });

    if (!parsed.success) {
      return { fieldErrors: zodFieldErrors(parsed.error) };
    }

    const supabase = await createClient();
    const { error } = await pm(supabase)
      .from("team_members")
      .update({
        name: parsed.data.name,
        avatar_url: parsed.data.avatar_url ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", teamMember.id);

    if (error) {
      return { error: error.message };
    }

    revalidateSettingsPaths();
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update profile.",
    };
  }
}

export async function changePassword(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  try {
    await requireTeamMember();
    const parsed = changePasswordSchema.safeParse({
      current_password: formData.get("current_password"),
      new_password: formData.get("new_password"),
      confirm_password: formData.get("confirm_password"),
    });

    if (!parsed.success) {
      return { fieldErrors: zodFieldErrors(parsed.error) };
    }

    const user = await getSessionUser();
    if (!user?.email) {
      return { error: "Unable to verify your account." };
    }

    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.current_password,
    });

    if (signInError) {
      return { error: "Current password is incorrect." };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.new_password,
    });

    if (updateError) {
      return { error: updateError.message };
    }

    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to change password.",
    };
  }
}
