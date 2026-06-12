"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/roles";
import { getTeamMember } from "@/lib/auth/session";
import { canViewClientCredentials } from "@/lib/credentials/access";
import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";
import { credentialFormSchema } from "@/lib/validations/credentials";
import type { z } from "zod";

export type CredentialFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
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

async function requireCredentialAccess(clientId: string) {
  const teamMember = await getTeamMember();
  if (!teamMember) {
    throw new Error("You must be signed in as a team member.");
  }

  const supabase = await createClient();
  const { data: client, error } = await supabase
    .from("clients")
    .select("account_manager_id")
    .eq("id", clientId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (
    !canViewClientCredentials(
      client?.account_manager_id ?? null,
      teamMember.id,
      isAdmin(teamMember.role),
    )
  ) {
    throw new Error("You don't have permission to manage access credentials.");
  }

  return { teamMember, supabase };
}

function parseCredentialForm(formData: FormData) {
  return {
    platform: formData.get("platform"),
    url: formData.get("url"),
    username: formData.get("username"),
    password: formData.get("password"),
    notes: formData.get("notes"),
  };
}

function revalidateClientAccess(clientId: string) {
  revalidatePath(`/clients/${clientId}`);
}

export async function createCredential(
  clientId: string,
  _prevState: CredentialFormState,
  formData: FormData,
): Promise<CredentialFormState> {
  try {
    const { teamMember, supabase } = await requireCredentialAccess(clientId);
    const parsed = credentialFormSchema.safeParse(parseCredentialForm(formData));

    if (!parsed.success) {
      return { fieldErrors: zodFieldErrors(parsed.error) };
    }

    const { error } = await pm(supabase)
      .from("client_credentials")
      .insert({
        client_id: clientId,
        platform: parsed.data.platform,
        url: parsed.data.url ?? null,
        username: parsed.data.username ?? null,
        password: parsed.data.password ?? null,
        notes: parsed.data.notes ?? null,
        created_by: teamMember.id,
      });

    if (error) {
      return { error: error.message };
    }

    revalidateClientAccess(clientId);
    return { success: true };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to create credentials.",
    };
  }
}

export async function updateCredential(
  clientId: string,
  credentialId: string,
  _prevState: CredentialFormState,
  formData: FormData,
): Promise<CredentialFormState> {
  try {
    await requireCredentialAccess(clientId);
    const parsed = credentialFormSchema.safeParse(parseCredentialForm(formData));

    if (!parsed.success) {
      return { fieldErrors: zodFieldErrors(parsed.error) };
    }

    const supabase = await createClient();
    const passwordRaw = formData.get("password");
    const updatePayload: {
      platform: string;
      url: string | null;
      username: string | null;
      notes: string | null;
      updated_at: string;
      password?: string;
    } = {
      platform: parsed.data.platform,
      url: parsed.data.url ?? null,
      username: parsed.data.username ?? null,
      notes: parsed.data.notes ?? null,
      updated_at: new Date().toISOString(),
    };

    if (typeof passwordRaw === "string" && passwordRaw.trim() !== "") {
      updatePayload.password = passwordRaw.trim();
    }

    const { error } = await pm(supabase)
      .from("client_credentials")
      .update(updatePayload)
      .eq("id", credentialId)
      .eq("client_id", clientId);

    if (error) {
      return { error: error.message };
    }

    revalidateClientAccess(clientId);
    return { success: true };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to update credentials.",
    };
  }
}

export async function deleteCredential(
  clientId: string,
  credentialId: string,
): Promise<{ error?: string }> {
  try {
    await requireCredentialAccess(clientId);
    const supabase = await createClient();

    const { error } = await pm(supabase)
      .from("client_credentials")
      .delete()
      .eq("id", credentialId)
      .eq("client_id", clientId);

    if (error) {
      return { error: error.message };
    }

    revalidateClientAccess(clientId);
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to delete credentials.",
    };
  }
}
