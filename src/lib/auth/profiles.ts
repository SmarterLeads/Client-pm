import { pm } from "@/lib/supabase/pm";
import { createServiceClient } from "@/lib/supabase/service";

export async function ensureTeamMember(
  authUserId: string,
  email: string,
  name?: string | null,
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  console.log("[ensureTeamMember] Supabase URL:", supabaseUrl);
  console.log(
    "[ensureTeamMember] querying pm.team_members by auth_user_id:",
    authUserId,
  );

  const supabase = createServiceClient();

  const { data: byAuth, error: byAuthError } = await pm(supabase)
    .from("team_members")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  console.log("[ensureTeamMember] pm.team_members by auth_user_id result:", {
    found: Boolean(byAuth),
    data: byAuth,
    error: byAuthError
      ? {
          message: byAuthError.message,
          code: byAuthError.code,
          details: byAuthError.details,
          hint: byAuthError.hint,
        }
      : null,
  });

  if (byAuthError) throw byAuthError;
  if (byAuth) return byAuth;

  console.log(
    "[ensureTeamMember] not found by auth_user_id, querying pm.team_members by email:",
    email,
  );

  const { data: byEmail, error: byEmailError } = await pm(supabase)
    .from("team_members")
    .select("id, auth_user_id")
    .ilike("email", email)
    .maybeSingle();

  console.log("[ensureTeamMember] pm.team_members by email result:", {
    found: Boolean(byEmail),
    data: byEmail,
    error: byEmailError
      ? {
          message: byEmailError.message,
          code: byEmailError.code,
          details: byEmailError.details,
          hint: byEmailError.hint,
        }
      : null,
  });

  if (byEmailError) throw byEmailError;

  if (byEmail) {
    if (byEmail.auth_user_id && byEmail.auth_user_id !== authUserId) {
      console.log(
        "[ensureTeamMember] email linked to different auth_user_id:",
        byEmail.auth_user_id,
      );
      throw new Error("This email is linked to another account.");
    }
    if (!byEmail.auth_user_id) {
      console.log(
        "[ensureTeamMember] linking auth_user_id to existing pm.team_members row:",
        byEmail.id,
      );
      const { error: linkError } = await pm(supabase)
        .from("team_members")
        .update({
          auth_user_id: authUserId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", byEmail.id);

      if (linkError) {
        console.error("[ensureTeamMember] link auth_user_id failed:", linkError);
        throw linkError;
      }
    }
    return byEmail;
  }

  const displayName =
    name?.trim() || email.split("@")[0] || "Team Member";

  console.log(
    "[ensureTeamMember] no pm.team_members row found, creating new member:",
    { email, displayName },
  );

  const { data: created, error: createError } = await pm(supabase)
    .from("team_members")
    .insert({
      auth_user_id: authUserId,
      email,
      name: displayName,
      role: "member",
    })
    .select("id")
    .single();

  console.log("[ensureTeamMember] create pm.team_members result:", {
    data: created,
    error: createError
      ? {
          message: createError.message,
          code: createError.code,
          details: createError.details,
          hint: createError.hint,
        }
      : null,
  });

  if (createError) throw createError;
  return created;
}

export async function ensureClientUserLinked(
  authUserId: string,
  email: string,
) {
  const supabase = createServiceClient();

  const { data: clientUser, error } = await pm(supabase)
    .from("client_portal_users")
    .select("id, auth_user_id, is_active")
    .ilike("email", email)
    .maybeSingle();

  if (error) throw error;

  if (!clientUser?.is_active) {
    throw new Error(
      "No active portal account found for this email. Contact your account manager.",
    );
  }

  if (clientUser.auth_user_id && clientUser.auth_user_id !== authUserId) {
    throw new Error("This portal account is linked to another sign-in.");
  }

  const now = new Date().toISOString();

  if (!clientUser.auth_user_id) {
    const { error: linkError } = await pm(supabase)
      .from("client_portal_users")
      .update({ auth_user_id: authUserId, last_login: now })
      .eq("id", clientUser.id);

    if (linkError) throw linkError;
  } else {
    const { error: loginError } = await pm(supabase)
      .from("client_portal_users")
      .update({ last_login: now })
      .eq("id", clientUser.id);

    if (loginError) throw loginError;
  }

  return clientUser;
}
