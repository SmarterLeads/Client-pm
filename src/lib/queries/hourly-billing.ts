import { createClient } from "@/lib/supabase/server";
import { pmRpc } from "@/lib/supabase/pm";

function throwQueryError(query: string, error: { message: string }): never {
  console.error(`[hourly-billing:${query}]`, error.message);
  throw new Error(error.message);
}

export async function getClientBillableHoursThisMonth(
  clientId: string,
): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await pmRpc<number>(
    supabase,
    "get_client_billable_hours_this_month",
    { p_client_id: clientId },
  );

  if (error) throwQueryError("getClientBillableHoursThisMonth", error);

  return Number(data ?? 0);
}
