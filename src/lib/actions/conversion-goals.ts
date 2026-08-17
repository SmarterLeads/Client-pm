"use server";

import { revalidatePath } from "next/cache";

import {
  deactivateClientConversionForGoal,
  syncClientConversions,
} from "@/lib/clients/sync-client-conversions";
import { getTeamMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ClientConversionGoalUpdate } from "@/lib/types";
import {
  addClientConversionGoalSchema,
  deleteClientConversionGoalSchema,
  updateClientConversionGoalSchema,
} from "@/lib/validations/conversion-goal";

async function requireTeamMember() {
  const teamMember = await getTeamMember();
  if (!teamMember) {
    throw new Error("You must be signed in as a team member.");
  }
  return teamMember;
}

function revalidateClientConversionPaths(clientId: string) {
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/marketing");
}

export async function addClientConversionGoal(
  clientId: string,
  platform: string,
): Promise<{ error?: string; goalId?: string }> {
  try {
    await requireTeamMember();
    const parsed = addClientConversionGoalSchema.safeParse({ clientId, platform });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const supabase = await createClient();
    const { data: existing, error: countError } = await supabase
      .from("client_conversion_goals")
      .select("sort_order")
      .eq("client_id", clientId)
      .eq("platform", platform)
      .eq("is_active", true)
      .order("sort_order", { ascending: false })
      .limit(1);

    if (countError) {
      return { error: countError.message };
    }

    const nextSortOrder = (existing?.[0]?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from("client_conversion_goals")
      .insert({
        client_id: clientId,
        platform,
        conversion_name: "New conversion",
        priority: "primary",
        sort_order: nextSortOrder,
      })
      .select("id")
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidateClientConversionPaths(clientId);
    return { goalId: data.id };
  } catch (err) {
    console.error("[addClientConversionGoal]", err);
    return {
      error:
        err instanceof Error ? err.message : "Failed to add conversion goal.",
    };
  }
}

export async function updateClientConversionGoal(
  input: Record<string, unknown>,
): Promise<{ error?: string }> {
  try {
    await requireTeamMember();
    const parsed = updateClientConversionGoalSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const { id, clientId, ...updates } = parsed.data;
    const supabase = await createClient();

    const { data: existing, error: fetchError } = await supabase
      .from("client_conversion_goals")
      .select("*")
      .eq("id", id)
      .eq("client_id", clientId)
      .maybeSingle();

    if (fetchError) {
      return { error: fetchError.message };
    }

    if (!existing) {
      return { error: "Conversion goal not found." };
    }

    const payload: ClientConversionGoalUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (updates.conversion_name !== undefined) {
      payload.conversion_name = updates.conversion_name;
    }
    if (updates.conversion_id !== undefined) {
      payload.conversion_id = updates.conversion_id;
    }
    if (updates.priority !== undefined) {
      payload.priority = updates.priority;
    }
    if (updates.conversion_value !== undefined) {
      payload.conversion_value = updates.conversion_value;
    }
    if (updates.notes !== undefined) {
      payload.notes = updates.notes;
    }

    const { data: saved, error: updateError } = await supabase
      .from("client_conversion_goals")
      .update(payload)
      .eq("id", id)
      .eq("client_id", clientId)
      .select("*")
      .single();

    if (updateError) {
      return { error: updateError.message };
    }

    console.log("[sync] updateClientConversionGoal saved goal:", {
      id: saved.id,
      clientId,
      platform: saved.platform,
      conversionName: saved.conversion_name,
      conversionId: saved.conversion_id,
      priority: saved.priority,
    });

    await syncClientConversions(clientId);

    revalidateClientConversionPaths(clientId);
    return {};
  } catch (err) {
    console.error("[updateClientConversionGoal]", err);
    return {
      error:
        err instanceof Error ? err.message : "Failed to update conversion goal.",
    };
  }
}

export async function deleteClientConversionGoal(
  id: string,
  clientId: string,
): Promise<{ error?: string }> {
  try {
    await requireTeamMember();
    const parsed = deleteClientConversionGoalSchema.safeParse({ id, clientId });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const supabase = await createClient();

    const { data: existing, error: fetchError } = await supabase
      .from("client_conversion_goals")
      .select("client_id, platform, conversion_id, conversion_name")
      .eq("id", id)
      .eq("client_id", clientId)
      .maybeSingle();

    if (fetchError) {
      return { error: fetchError.message };
    }

    if (!existing) {
      return { error: "Conversion goal not found." };
    }

    await deactivateClientConversionForGoal(undefined, existing);

    const { error: deleteError } = await supabase
      .from("client_conversion_goals")
      .delete()
      .eq("id", id)
      .eq("client_id", clientId);

    if (deleteError) {
      return { error: deleteError.message };
    }

    revalidateClientConversionPaths(clientId);
    return {};
  } catch (err) {
    console.error("[deleteClientConversionGoal]", err);
    return {
      error:
        err instanceof Error ? err.message : "Failed to delete conversion goal.",
    };
  }
}
