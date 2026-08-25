import { createServiceClient } from "@/lib/supabase/service";
import {
  canonicalReportPlatformSlug,
  platformSlugMatchesRow,
} from "@/lib/marketing/report/report-tab-platform";
import {
  inferConversionGoalType,
  type ConversionGoalType,
} from "@/lib/clients/conversion-goal-types";
import type { Database } from "@/lib/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type DbClient = SupabaseClient<Database>;

export type ConversionGoalSyncRow = {
  id?: string;
  client_id: string;
  platform: string;
  conversion_name: string;
  conversion_id: string | null;
  priority: string;
  conversion_type?: string | null;
  is_active: boolean;
  sort_order: number;
};

type ClientConversionRow = {
  id: string;
  platform: string;
  raw_name: string;
  display_name: string | null;
  mapped_name: string | null;
};

function canonicalPlatform(platform: string): string {
  return (
    canonicalReportPlatformSlug(platform) ?? platform.trim().toLowerCase()
  );
}

function conversionRowLabel(row: Pick<ClientConversionRow, "display_name" | "mapped_name" | "raw_name">): string {
  return (
    row.display_name?.trim() ||
    row.mapped_name?.trim() ||
    row.raw_name?.trim() ||
    ""
  );
}

function rawNamesMatch(a: string, b: string): boolean {
  const left = a.trim();
  const right = b.trim();
  if (!left || !right) return false;
  return left === right || left.toLowerCase() === right.toLowerCase();
}

function namesMatch(a: string, b: string): boolean {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  return left.length > 0 && left === right;
}

/** Match `client_conversions` rows for a goal (platform slug + raw_name or display name). */
export function findMatchingClientConversions(
  conversions: ClientConversionRow[],
  goal: Pick<ConversionGoalSyncRow, "platform" | "conversion_id" | "conversion_name">,
): ClientConversionRow[] {
  const platformSlug = canonicalPlatform(goal.platform);
  const conversionId = goal.conversion_id?.trim() ?? "";
  const conversionName = goal.conversion_name.trim();

  const platformMatches = conversions.filter((row) =>
    platformSlugMatchesRow(row.platform ?? "", platformSlug),
  );

  if (conversionId) {
    const byRaw = platformMatches.filter((row) =>
      rawNamesMatch(row.raw_name ?? "", conversionId),
    );
    if (byRaw.length > 0) return byRaw;
  }

  if (conversionName) {
    return platformMatches.filter((row) =>
      namesMatch(conversionRowLabel(row), conversionName),
    );
  }

  return [];
}

function logSyncUpdate(args: {
  clientId: string;
  platform: string;
  conversionName: string;
  isActive: boolean;
  conversionId?: string | null;
  matchedIds?: string[];
  action?: string;
}) {
  console.log("[sync] updating client_conversions:", {
    clientId: args.clientId,
    platform: args.platform,
    conversionName: args.conversionName,
    isActive: args.isActive,
    conversionId: args.conversionId ?? null,
    matchedIds: args.matchedIds ?? [],
    action: args.action ?? "update",
  });
}

async function activateClientConversion(
  supabase: DbClient,
  rowId: string,
  goal: ConversionGoalSyncRow,
  displayName: string,
  conversionType: ConversionGoalType,
) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("client_conversions")
    .update({
      display_name: displayName,
      group_name: displayName,
      conversion_type: conversionType,
      is_active: true,
      is_primary: true,
      sort_order: goal.sort_order,
      last_seen_at: now,
    })
    .eq("id", rowId);

  if (error) {
    throw new Error(error.message);
  }
}

async function deactivateClientConversionById(supabase: DbClient, rowId: string) {
  const { error } = await supabase
    .from("client_conversions")
    .update({ is_active: false, is_primary: false })
    .eq("id", rowId);

  if (error) {
    throw new Error(error.message);
  }
}

async function insertClientConversion(
  supabase: DbClient,
  goal: ConversionGoalSyncRow,
  rawName: string,
  displayName: string,
  conversionType: ConversionGoalType,
) {
  const now = new Date().toISOString();
  const platform = canonicalPlatform(goal.platform);

  const { error } = await supabase.from("client_conversions").insert({
    client_id: goal.client_id,
    platform,
    raw_name: rawName,
    display_name: displayName,
    group_name: displayName,
    conversion_type: conversionType,
    status: "mapped",
    is_active: true,
    is_primary: true,
    sort_order: goal.sort_order,
    first_seen_at: now,
    last_seen_at: now,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Sync one goal row to `client_conversions`.
 * Prefer {@link syncClientConversions} after mutations so all goals stay aligned.
 */
export async function syncClientConversionFromGoal(
  supabase: DbClient,
  goal: ConversionGoalSyncRow,
  allConversions?: ClientConversionRow[],
) {
  await syncClientConversions(goal.client_id, supabase, allConversions, goal.id);
}

/**
 * Reconcile all conversion goals for a client with `client_conversions`.
 * Primary goals → is_active true; secondary / inactive goals → is_active false.
 */
export async function syncClientConversions(
  clientId: string,
  supabase: DbClient = createServiceClient(),
  cachedConversions?: ClientConversionRow[],
  onlyGoalId?: string,
) {
  const { data: goals, error: goalsError } = await supabase
    .from("client_conversion_goals")
    .select(
      "id, client_id, platform, conversion_name, conversion_id, priority, conversion_type, is_active, sort_order",
    )
    .eq("client_id", clientId)
    .eq("is_active", true);

  if (goalsError) {
    throw new Error(goalsError.message);
  }

  let conversions = cachedConversions;
  if (!conversions) {
    const { data, error } = await supabase
      .from("client_conversions")
      .select("id, platform, raw_name, display_name, mapped_name")
      .eq("client_id", clientId);

    if (error) {
      throw new Error(error.message);
    }
    conversions = data ?? [];
  }

  const goalsToSync = onlyGoalId
    ? (goals ?? []).filter((goal) => goal.id === onlyGoalId)
    : (goals ?? []);

  for (const goal of goalsToSync) {
    const shouldActivate =
      goal.is_active && goal.priority === "primary";
    const matches = findMatchingClientConversions(conversions, goal);
    const displayName = goal.conversion_name.trim() || goal.conversion_id?.trim() || "";
    const rawName = goal.conversion_id?.trim() || matches[0]?.raw_name?.trim() || "";
    const conversionType = inferConversionGoalType(goal);

    logSyncUpdate({
      clientId: goal.client_id,
      platform: goal.platform,
      conversionName: goal.conversion_name,
      isActive: shouldActivate,
      conversionId: goal.conversion_id,
      matchedIds: matches.map((row) => row.id),
      action: shouldActivate ? "activate" : "deactivate",
    });

    if (shouldActivate) {
      if (matches.length > 0) {
        for (const row of matches) {
          await activateClientConversion(
            supabase,
            row.id,
            goal,
            displayName || row.raw_name,
            conversionType,
          );
        }
        continue;
      }

      if (rawName) {
        await insertClientConversion(
          supabase,
          goal,
          rawName,
          displayName || rawName,
          conversionType,
        );
        const { data: refreshed } = await supabase
          .from("client_conversions")
          .select("id, platform, raw_name, display_name, mapped_name")
          .eq("client_id", clientId);
        conversions = refreshed ?? conversions;
      }
      continue;
    }

    for (const row of matches) {
      await deactivateClientConversionById(supabase, row.id);
    }
  }
}

export async function deactivateClientConversionForGoal(
  supabase: DbClient = createServiceClient(),
  goal: Pick<
    ConversionGoalSyncRow,
    "client_id" | "platform" | "conversion_id" | "conversion_name"
  >,
) {
  const { data, error } = await supabase
    .from("client_conversions")
    .select("id, platform, raw_name, display_name, mapped_name")
    .eq("client_id", goal.client_id);

  if (error) {
    throw new Error(error.message);
  }

  const matches = findMatchingClientConversions(data ?? [], goal);

  logSyncUpdate({
    clientId: goal.client_id,
    platform: goal.platform,
    conversionName: goal.conversion_name,
    isActive: false,
    conversionId: goal.conversion_id,
    matchedIds: matches.map((row) => row.id),
    action: "delete",
  });

  for (const row of matches) {
    await deactivateClientConversionById(supabase, row.id);
  }
}
