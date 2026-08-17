import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

type DbClient = SupabaseClient<Database>;

export type ConversionGoalSyncRow = {
  client_id: string;
  platform: string;
  conversion_name: string;
  conversion_id: string | null;
  priority: string;
  is_active: boolean;
  sort_order: number;
};

async function deactivateClientConversion(
  supabase: DbClient,
  clientId: string,
  platform: string,
  rawName: string,
) {
  const { error } = await supabase
    .from("client_conversions")
    .update({ is_active: false, is_primary: false })
    .eq("client_id", clientId)
    .eq("platform", platform)
    .eq("raw_name", rawName);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Keeps `client_conversions` aligned with a saved conversion goal for the
 * marketing dashboard breakdown.
 */
export async function syncClientConversionFromGoal(
  supabase: DbClient,
  goal: ConversionGoalSyncRow,
  options?: { previousConversionId?: string | null },
) {
  const platform = goal.platform.trim();
  const rawName = goal.conversion_id?.trim() ?? "";
  const previousRawName = options?.previousConversionId?.trim() ?? "";

  if (previousRawName && previousRawName !== rawName) {
    await deactivateClientConversion(
      supabase,
      goal.client_id,
      platform,
      previousRawName,
    );
  }

  if (!rawName) {
    return;
  }

  const shouldActivate =
    goal.is_active && goal.priority === "primary" && rawName.length > 0;

  if (!shouldActivate) {
    await deactivateClientConversion(supabase, goal.client_id, platform, rawName);
    return;
  }

  const displayName = goal.conversion_name.trim() || rawName;
  const now = new Date().toISOString();

  const { data: existing, error: lookupError } = await supabase
    .from("client_conversions")
    .select("id")
    .eq("client_id", goal.client_id)
    .eq("platform", platform)
    .eq("raw_name", rawName)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  const payload = {
    display_name: displayName,
    group_name: displayName,
    is_active: true,
    is_primary: true,
    sort_order: goal.sort_order,
    last_seen_at: now,
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("client_conversions")
      .update(payload)
      .eq("id", existing.id);

    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const { error: insertError } = await supabase.from("client_conversions").insert({
    client_id: goal.client_id,
    platform,
    raw_name: rawName,
    display_name: displayName,
    group_name: displayName,
    conversion_type: "lead",
    status: "mapped",
    is_active: true,
    is_primary: true,
    sort_order: goal.sort_order,
    first_seen_at: now,
    last_seen_at: now,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }
}

export async function deactivateClientConversionForGoal(
  supabase: DbClient,
  goal: Pick<
    ConversionGoalSyncRow,
    "client_id" | "platform" | "conversion_id"
  >,
) {
  const rawName = goal.conversion_id?.trim();
  if (!rawName) return;

  await deactivateClientConversion(
    supabase,
    goal.client_id,
    goal.platform.trim(),
    rawName,
  );
}
