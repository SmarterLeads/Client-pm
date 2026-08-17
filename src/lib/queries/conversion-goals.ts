import { createClient } from "@/lib/supabase/server";
import type { ClientConversionGoal } from "@/lib/types";

export async function getClientConversionGoals(
  clientId: string,
): Promise<ClientConversionGoal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_conversion_goals")
    .select("*")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[getClientConversionGoals]", error.message);
    return [];
  }

  return data ?? [];
}
